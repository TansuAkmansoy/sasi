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
    deduction_minor: null, payments: [], ...p,
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
