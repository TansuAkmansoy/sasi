import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcPrice } from './fiyat.ts';
import { money, parseMoney, moneyInput } from './para.ts';
import { nights, nightList, addDays, fmt, fmtRange, weekdayMon, addMonths } from './tarih.ts';
import { busyNights, findConflict, moneyOf, missingOf, awaitingCompletion, optionDueSoon } from './durum.ts';
import type { MonthlyPrice, Reservation } from './types.ts';

const P: MonthlyPrice[] = [
  { villa_id: 'v', year: 2026, month: 7, weekly_minor: 700000, currency: 'EUR' },
  { villa_id: 'v', year: 2026, month: 8, weekly_minor: 840000, currency: 'EUR' },
];

test('7 gece = haftalık ücret', () => {
  const r = calcPrice('v', '2026-07-04', '2026-07-11', P);
  assert.equal(r.ok, true);
  assert.equal(r.nights, 7);
  assert.equal(r.total_minor, 700000);
});

test('8 gece = haftalık + 1 gece', () => {
  const r = calcPrice('v', '2026-07-04', '2026-07-12', P);
  assert.equal(r.total_minor, 800000);
});

test('ay geçişi: her gece kendi ayının fiyatı', () => {
  // 28,29,30,31 Tem (4 gece) + 1,2,3 Ağu (3 gece)
  const r = calcPrice('v', '2026-07-28', '2026-08-04', P);
  assert.equal(r.lines.length, 2);
  assert.equal(r.lines[0].nights, 4);
  assert.equal(r.lines[1].nights, 3);
  assert.equal(r.total_minor, 400000 + 360000);
});

test('yuvarlama yalnız toplamda', () => {
  const p: MonthlyPrice[] = [{ villa_id: 'v', year: 2026, month: 6, weekly_minor: 100000, currency: 'GBP' }];
  // 10 gece × 1000/7 = 1428,571.. → 142857
  assert.equal(calcPrice('v', '2026-06-01', '2026-06-11', p).total_minor, 142857);
});

test('fiyatı girilmemiş ay', () => {
  const r = calcPrice('v', '2026-08-30', '2026-09-02', P);
  assert.equal(r.ok, false);
  assert.deepEqual(r.missingMonths, ['Eyl 2026']);
});

test('para biçimi ve okuma', () => {
  assert.equal(money(125000, 'EUR'), '1.250 €');
  assert.equal(money(125050, 'TRY'), '1.250,50 ₺');
  assert.equal(money(-5000, 'GBP'), '−50 £');
  assert.equal(parseMoney('1.250,50'), 125050);
  assert.equal(parseMoney('1250.5'), 125050);
  assert.equal(parseMoney('1.250'), 125000);
  assert.equal(parseMoney('12.500.000'), 1250000000);
  assert.equal(parseMoney('7000'), 700000);
  assert.equal(parseMoney(''), null);
  assert.equal(parseMoney('abc'), null);
  assert.equal(moneyInput(125050), '1250,50');
  assert.equal(moneyInput(125000), '1250');
});

test('tarih yardımcıları', () => {
  assert.equal(nights('2026-07-28', '2026-08-04'), 7);
  assert.deepEqual(nightList('2026-12-30', '2027-01-02'), ['2026-12-30', '2026-12-31', '2027-01-01']);
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(fmt('2026-07-12'), '12 Tem 2026');
  assert.equal(fmtRange('2026-07-12', '2026-07-19'), '12 Tem → 19 Tem 2026');
  assert.equal(weekdayMon('2026-11-02'), 0); // Pazartesi
  assert.deepEqual(addMonths(2026, 12, 1), { y: 2027, m: 1 });
  assert.deepEqual(addMonths(2026, 1, -1), { y: 2025, m: 12 });
});

function res(p: Partial<Reservation>): Reservation {
  return {
    id: 'r', villa_id: 'v', status: 'confirmed', check_in: '2026-07-10', check_out: '2026-07-17', option_until: null,
    guest_name: 'X', guest_phone: null, guest_email: null, guests_count: null, currency: 'EUR', gross_minor: 700000,
    manual_price: false, agency_id: null, commission_pct: null, commission_minor: null, invoice_date: null,
    registry_done: false, registry_date: null, note: null, cancel_date: null, cancel_reason: null, refund_status: null,
    deduction_minor: null, stay_minor: null, suggested_minor: null, pet: false, pet_fee_minor: null, short_stay_fee_minor: null, hold_until: null, payments: [], ...p,
  };
}

test('çakışma: aynı gün devir serbest, iptal sayılmaz', () => {
  const all = [res({ id: 'a' }), res({ id: 'b', check_in: '2026-07-20', check_out: '2026-07-25', status: 'cancelled' })];
  assert.equal(findConflict(all, 'v', '2026-07-17', '2026-07-20'), undefined); // çıkış günü giriş
  assert.equal(findConflict(all, 'v', '2026-07-03', '2026-07-10'), undefined); // giriş günü çıkış
  assert.equal(findConflict(all, 'v', '2026-07-16', '2026-07-18')?.id, 'a');
  assert.equal(findConflict(all, 'v', '2026-07-21', '2026-07-23'), undefined); // iptal edilmiş
  assert.equal(findConflict(all, 'v', '2026-07-12', '2026-07-14', 'a'), undefined); // kendisi
  assert.equal(findConflict(all, 'w', '2026-07-12', '2026-07-14'), undefined); // başka villa
  assert.equal(busyNights(all, 'v').size, 7);
});

test('ödeme hesapları ve kur', () => {
  const r = res({
    agency_id: 'ag', commission_pct: 15,
    payments: [
      { kind: 'deposit', amount_minor: 200000, currency: 'EUR', rate: null, method: 'transfer', paid_on: '2026-05-01' },
      { kind: 'interim', amount_minor: 100000, currency: 'GBP', rate: 1.17, method: 'cash', paid_on: '2026-06-01' },
      { kind: 'interim', amount_minor: 5000000, currency: 'TRY', rate: null, method: 'cash', paid_on: '2026-06-01' },
    ],
  });
  const m = moneyOf(r);
  assert.equal(m.received, 317000);
  assert.equal(m.remaining, 383000);
  assert.equal(m.commission, 105000);
  assert.equal(m.net_income, 595000);
  assert.equal(m.deposit, 200000);
  assert.equal(m.unconverted, true);
});

test('bekleyen işler', () => {
  const r = res({});
  assert.equal(awaitingCompletion(r, '2026-07-16'), false);
  assert.equal(awaitingCompletion(r, '2026-07-17'), true);
  assert.deepEqual(missingOf(r, '2026-07-18').sort(), ['invoice', 'payment', 'registry']);
  assert.deepEqual(missingOf(res({ registry_done: true, invoice_date: '2026-07-17', payments: [{ kind: 'deposit', amount_minor: 700000, currency: 'EUR', rate: null, method: 'cash', paid_on: '2026-07-01' }] }), '2026-07-18'), []);
  assert.equal(optionDueSoon(res({ status: 'option', option_until: '2026-06-02' }), '2026-06-01'), true);
  assert.equal(optionDueSoon(res({ status: 'option', option_until: '2026-06-05' }), '2026-06-01'), false);
});

// ---------------- v1.1 ----------------
import { extrasOf, stayOf, grossOf, isShortStay, minusMonths, cancelDeadline, paymentPlan, holdUntilFromNow } from './ucret.ts';
import { buildMessage, buildVars, fill, mergeSettings, DEFAULT_FEES } from './sablon.ts';
import { optionExpired } from './durum.ts';

test('ekstralar ve brüt', () => {
  assert.equal(grossOf(300000, true, 10000, 15000), 325000);
  assert.equal(grossOf(300000, false, 10000, null), 300000);
  const r = res({ gross_minor: 325000, stay_minor: null, pet: true, pet_fee_minor: 10000, short_stay_fee_minor: 15000 });
  assert.equal(extrasOf(r), 25000);
  assert.equal(stayOf(r), 300000);
  assert.equal(stayOf({ ...r, stay_minor: 290000 }), 290000);
  assert.equal(extrasOf({ pet: false, pet_fee_minor: 10000, short_stay_fee_minor: null }), 0);
});

test('kısa konaklama: 5 geceden az', () => {
  assert.equal(isShortStay(4, DEFAULT_FEES), true);
  assert.equal(isShortStay(5, DEFAULT_FEES), false);
  assert.equal(isShortStay(0, DEFAULT_FEES), false);
});

test('iptal son tarihi: girişten 1 ay önce', () => {
  assert.equal(cancelDeadline('2026-07-15', DEFAULT_FEES), '2026-06-15');
  assert.equal(minusMonths('2027-03-31', 1), '2027-02-28');
  assert.equal(minusMonths('2027-01-10', 1), '2026-12-10');
});

test('ödeme planı', () => {
  assert.deepEqual(paymentPlan(100000, '2026-06-01', '2026-07-01', 1), [{ date: '2026-07-01', amount_minor: 100000 }]);
  const p = paymentPlan(100050, '2026-06-01', '2026-07-01', 3);
  assert.equal(p.length, 3);
  assert.equal(p.reduce((s, x) => s + x.amount_minor, 0), 100050);
  assert.deepEqual(p.map((x) => x.date), ['2026-06-11', '2026-06-21', '2026-07-01']);
  assert.equal(p[0].amount_minor, 33300);
  assert.deepEqual(paymentPlan(0, '2026-06-01', '2026-07-01', 2), []);
  assert.deepEqual(paymentPlan(5000, '2026-07-05', '2026-07-01', 3), [{ date: '2026-07-05', amount_minor: 5000 }]);
});

test('hold süresi saatle', () => {
  const now = Date.parse('2026-06-01T10:00:00Z');
  const h = holdUntilFromNow(24, new Date(now));
  assert.equal(h, '2026-06-02T10:00:00.000Z');
  assert.equal(optionExpired({ status: 'option', option_until: '2026-06-02', hold_until: h }, '2026-06-02', now + 23 * 3600_000), false);
  assert.equal(optionExpired({ status: 'option', option_until: '2026-06-02', hold_until: h }, '2026-06-02', now + 24 * 3600_000), true);
});

test('mesaj şablonu', () => {
  const s = mergeSettings({ fees: { pet_fee_minor: 10000 } });
  assert.equal(s.fees.short_stay_nights, 5);
  assert.equal(fill('A {x} {yok}', { x: '1' }), 'A 1 {yok}');
  const r = res({ guest_name: 'Ayşe', check_in: '2026-07-10', check_out: '2026-07-14', gross_minor: 425000, stay_minor: 400000, pet: true, pet_fee_minor: 10000, short_stay_fee_minor: 15000, guests_count: 4,
    payments: [{ kind: 'deposit', amount_minor: 100000, currency: 'EUR', rate: null, method: 'agency', paid_on: '2026-05-01' }] });
  const v = buildVars(r, { id: 'v', name: 'Villa Poyraz', sort: 1, currency: 'EUR', active: true }, undefined, s);
  assert.equal(v.giris, '10 Temmuz 2026 Cuma');
  assert.equal(v.iptal_son_tarih, '10 Haziran 2026 Çarşamba');
  assert.match(v.ucret_dokumu, /Evcil hayvan ücreti \(tek sefer\): 100 €/);
  assert.match(v.ucret_dokumu, /TOPLAM: 4\.250 €/);
  const msg = buildMessage('confirm', r, { id: 'v', name: 'Villa Poyraz', sort: 1, currency: 'EUR', active: true }, undefined, s);
  assert.match(msg, /Villa Poyraz rezervasyonunuz onaylanmıştır/);
  assert.match(msg, /Kalan: 3\.250 €/);
  assert.match(msg, /girişten 1 ay öncesine kadar \(10 Haziran 2026 Çarşamba\)/);
  assert.doesNotMatch(msg, /\{[a-z_]+\}/);
  const hold = buildMessage('hold', { ...r, status: 'option', hold_until: '2026-06-02T11:00:00.000Z' }, undefined, undefined, s);
  assert.doesNotMatch(hold, /\{[a-z_]+\}/);
});

// ---------------- v1.2: TCMB kurları ----------------
import { parseTcmb, convert, crossRate, tcmbUrl } from './kur.ts';

const TCMB_XML = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="isokur.xsl"?>
<Tarih_Date Tarih="30.10.2026" Date="10/30/2026"  Bulten_No="2026/206" >
	<Currency CrossOrder="0" Kod="USD" CurrencyCode="USD">
			<Unit>1</Unit>
			<Isim>ABD DOLARI</Isim>
			<CurrencyName>US DOLLAR</CurrencyName>
			<ForexBuying>41.8721</ForexBuying>
			<ForexSelling>41.9476</ForexSelling>
			<BanknoteBuying>41.8428</BanknoteBuying>
			<BanknoteSelling>42.0105</BanknoteSelling>
			<CrossRateUSD/>
			<CrossRateOther/>
	</Currency>
	<Currency CrossOrder="1" Kod="AUD" CurrencyCode="AUD">
			<Unit>1</Unit>
			<ForexSelling>27.5</ForexSelling>
	</Currency>
	<Currency CrossOrder="9" Kod="EUR" CurrencyCode="EUR">
			<Unit>1</Unit>
			<Isim>EURO</Isim>
			<ForexBuying>48.6</ForexBuying>
			<ForexSelling>48.7</ForexSelling>
	</Currency>
	<Currency CrossOrder="10" Kod="GBP" CurrencyCode="GBP">
			<Unit>1</Unit>
			<ForexSelling>55.4</ForexSelling>
	</Currency>
	<Currency CrossOrder="11" Kod="JPY" CurrencyCode="JPY">
			<Unit>100</Unit>
			<ForexSelling>27.30</ForexSelling>
	</Currency>
</Tarih_Date>`;

test('TCMB bülteni okunur ve kur çevrilir', () => {
  const r = parseTcmb(TCMB_XML)!;
  assert.equal(r.date, '2026-10-30');
  assert.equal(r.USD, 41.9476);
  assert.equal(r.EUR, 48.7);
  assert.equal(r.GBP, 55.4);
  assert.equal(convert(100000, 'EUR', 'TRY', r), 4870000); // 1.000 € = 48.700 ₺
  assert.equal(convert(4870000, 'TRY', 'EUR', r), 100000);
  assert.equal(convert(100000, 'EUR', 'EUR', r), 100000);
  assert.equal(Math.round(crossRate('GBP', 'EUR', r) * 10000) / 10000, 1.1376);
  assert.equal(parseTcmb('<html>hata</html>'), null);
  assert.equal(tcmbUrl('2026-10-30'), 'https://www.tcmb.gov.tr/kurlar/202610/30102026.xml');
  assert.equal(tcmbUrl(), 'https://www.tcmb.gov.tr/kurlar/today.xml');
});
