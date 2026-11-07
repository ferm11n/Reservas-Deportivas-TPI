import { fechaLocal, leerIdDeTurno } from '../src/servicios/api';

describe('fechaLocal', () => {
  it('formatea la fecha local como AAAA-MM-DD con ceros a la izquierda', () => {
    expect(fechaLocal(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('usa el día local aunque en UTC ya sea el día siguiente', () => {
    // A las 23:30 de Argentina (UTC-3), toISOString() daría el día siguiente.
    expect(fechaLocal(new Date(2026, 10, 5, 23, 30))).toBe('2026-11-05');
  });
});

describe('leerIdDeTurno', () => {
  it('desarma un id de turno válido en espacio, fecha y horario', () => {
    expect(leerIdDeTurno('tur-esp-02-20261105-21')).toEqual({
      espacioId: 'esp-02',
      fecha: '2026-11-05',
      inicio: '21:00',
      fin: '22:00',
    });
  });

  it('calcula el fin como una hora después del inicio, con cero a la izquierda', () => {
    expect(leerIdDeTurno('tur-esp-10-20260101-08')?.fin).toBe('09:00');
  });

  it('devuelve null para ids que no siguen el formato tur-<esp>-<fecha>-<hora>', () => {
    expect(leerIdDeTurno('reserva-123')).toBeNull();
    expect(leerIdDeTurno('tur-esp-02-2026-21')).toBeNull();
    expect(leerIdDeTurno('')).toBeNull();
  });
});
