/**
 * TicketMaster Edge Case Tests (Q8)
 *
 * Tests mirror the business logic from App.jsx.
 * Run: npm test
 */

// ── Helpers (mirror logic from App.jsx) ─────────────────
const GOLD_SEATS = [1, 2, 3, 4, 5, 6, 7, 8];
const SILVER_SEATS = [9, 10];
const TOTAL_SEATS = 10;

function allocateSeat(attendees, category) {
  const seats = category === 'Gold' ? GOLD_SEATS : SILVER_SEATS;
  const occupied = new Set(attendees.map(a => a.seatNumber));
  const available = seats.filter(s => !occupied.has(s));
  return available.length > 0 ? available[0] : null;
}

function validateAdd(attendees, { name, phone, category }) {
  if (!name || !phone) return 'Name and Phone are required.';
  if (attendees.some(a => a.phone === phone)) return 'Phone number already registered.';
  if (attendees.some(a => a.name.toLowerCase() === name.toLowerCase())) return 'An attendee with this name already exists.';
  if (attendees.length >= TOTAL_SEATS) return 'All seats are fully booked.';
  if (!allocateSeat(attendees, category)) return 'No ' + category + ' seats available.';
  return null;
}

function validateDelete(attendees, seatNumber) {
  if (attendees.length === 0) return 'No attendees to delete.';
  if (!attendees.find(a => a.seatNumber === seatNumber)) return 'No attendee found at seat ' + seatNumber + '.';
  return null;
}

// ── Test Data ───────────────────────────────────────────
const sample = [
  { id: 1, name: 'Alice', phone: '91234567', seatNumber: 1, ticketCategory: 'Gold' },
  { id: 2, name: 'Bob', phone: '98765432', seatNumber: 9, ticketCategory: 'Silver' },
];

// ── Q8a: Seat Allocation Tests ──────────────────────────
describe('Seat Allocation', () => {
  test('allocates lowest available Gold seat', () => {
    expect(allocateSeat(sample, 'Gold')).toBe(2);
  });

  test('allocates lowest available Silver seat', () => {
    expect(allocateSeat(sample, 'Silver')).toBe(10);
  });

  test('returns null when all Gold seats occupied', () => {
    const fullGold = GOLD_SEATS.map((s, i) => ({
      id: i + 1, seatNumber: s, ticketCategory: 'Gold',
    }));
    expect(allocateSeat(fullGold, 'Gold')).toBeNull();
  });

  test('returns null when all Silver seats occupied', () => {
    const fullSilver = SILVER_SEATS.map((s, i) => ({
      id: i + 1, seatNumber: s, ticketCategory: 'Silver',
    }));
    expect(allocateSeat(fullSilver, 'Silver')).toBeNull();
  });

  test('re-allocates freed seat after deletion', () => {
    const afterDelete = sample.filter(a => a.id !== 1);
    expect(allocateSeat(afterDelete, 'Gold')).toBe(1);
  });
});

// ── Q8b: Available Tickets Count ────────────────────────
describe('Available Tickets Count', () => {
  test('correct count with 2 attendees', () => {
    expect(TOTAL_SEATS - sample.length).toBe(8);
  });

  test('correct count with 0 attendees', () => {
    expect(TOTAL_SEATS - 0).toBe(10);
  });

  test('correct count when full', () => {
    expect(TOTAL_SEATS - 10).toBe(0);
  });
});

// ── Q8c: Overflow / Underflow Edge Cases ────────────────
describe('Edge Cases - Overflow and Underflow', () => {
  test('overflow: rejects booking when all 10 seats taken', () => {
    const full = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1, name: 'P' + i, phone: '' + i, seatNumber: i + 1,
      ticketCategory: i < 8 ? 'Gold' : 'Silver',
    }));
    expect(validateAdd(full, { name: 'Extra', phone: '999', category: 'Gold' }))
      .toBe('All seats are fully booked.');
  });

  test('overflow: rejects when chosen category is full', () => {
    const fullSilver = [
      ...sample,
      { id: 3, name: 'C', phone: '33', seatNumber: 10, ticketCategory: 'Silver' },
    ];
    expect(validateAdd(fullSilver, { name: 'D', phone: '44', category: 'Silver' }))
      .toBe('No Silver seats available.');
  });

  test('underflow: rejects delete when list is empty', () => {
    expect(validateDelete([], 1)).toBe('No attendees to delete.');
  });
});

// ── Q8d: Additional Edge Cases ──────────────────────────
describe('Additional Edge Cases', () => {
  test('rejects empty name', () => {
    expect(validateAdd([], { name: '', phone: '123', category: 'Gold' }))
      .toBe('Name and Phone are required.');
  });

  test('rejects empty phone', () => {
    expect(validateAdd([], { name: 'Test', phone: '', category: 'Gold' }))
      .toBe('Name and Phone are required.');
  });

  test('rejects duplicate phone number', () => {
    expect(validateAdd(sample, { name: 'New', phone: '91234567', category: 'Gold' }))
      .toBe('Phone number already registered.');
  });

  test('rejects duplicate name (case-insensitive)', () => {
    expect(validateAdd(sample, { name: 'alice', phone: '99999999', category: 'Gold' }))
      .toBe('An attendee with this name already exists.');
  });

  test('rejects delete for unoccupied seat', () => {
    expect(validateDelete(sample, 5)).toBe('No attendee found at seat 5.');
  });

  test('accepts valid add input', () => {
    expect(validateAdd(sample, { name: 'New', phone: '11111111', category: 'Gold' }))
      .toBeNull();
  });

  test('accepts valid delete for occupied seat', () => {
    expect(validateDelete(sample, 1)).toBeNull();
  });
});

// ── Integration-style Scenarios ─────────────────────────
describe('Integration Scenarios', () => {
  test('add then delete: seat becomes available again', () => {
    let attendees = [...sample];
    // Add a new Gold attendee
    const seat = allocateSeat(attendees, 'Gold');
    expect(seat).toBe(2);
    attendees.push({ id: 3, name: 'Charlie', phone: '55555555', seatNumber: seat, ticketCategory: 'Gold' });
    expect(attendees.length).toBe(3);
    expect(TOTAL_SEATS - attendees.length).toBe(7);

    // Delete that attendee
    attendees = attendees.filter(a => a.id !== 3);
    expect(attendees.length).toBe(2);
    expect(allocateSeat(attendees, 'Gold')).toBe(2); // seat 2 free again
  });

  test('fill all 10 seats sequentially', () => {
    let attendees = [];
    // Fill 8 Gold
    for (let i = 0; i < 8; i++) {
      const seat = allocateSeat(attendees, 'Gold');
      expect(seat).toBe(i + 1);
      attendees.push({ id: i + 1, name: 'G' + i, phone: '' + i, seatNumber: seat, ticketCategory: 'Gold' });
    }
    // Fill 2 Silver
    for (let i = 0; i < 2; i++) {
      const seat = allocateSeat(attendees, 'Silver');
      expect(seat).toBe(9 + i);
      attendees.push({ id: 9 + i, name: 'S' + i, phone: '9' + i, seatNumber: seat, ticketCategory: 'Silver' });
    }
    expect(attendees.length).toBe(10);
    expect(TOTAL_SEATS - attendees.length).toBe(0);
    // 11th booking should fail
    expect(validateAdd(attendees, { name: 'Extra', phone: '999', category: 'Gold' }))
      .toBe('All seats are fully booked.');
  });

  test('Gold full but Silver still available', () => {
    const fullGold = GOLD_SEATS.map((s, i) => ({
      id: i + 1, name: 'G' + i, phone: '' + i, seatNumber: s, ticketCategory: 'Gold',
    }));
    expect(validateAdd(fullGold, { name: 'New', phone: '999', category: 'Gold' }))
      .toBe('No Gold seats available.');
    expect(validateAdd(fullGold, { name: 'New', phone: '999', category: 'Silver' }))
      .toBeNull();
  });
});
