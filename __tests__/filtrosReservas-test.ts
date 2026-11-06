import { filtrarReservasPorPestania, contarReservasActivas } from '../src/servicios/filtrosReservas';
import { EstadoReserva, Reserva } from '../src/tipos';

const reserva = (id: string, estado: EstadoReserva): Reserva => ({
  id,
  turnoId: `tur-esp-02-20261105-21`,
  espacioId: 'esp-02',
  usuarioId: 'usr-01',
  cantidadPersonas: 10,
  codigoQr: `QR-${id}`,
  estado,
  ingresoEn: null,
  creadaEn: '2026-11-01T10:00:00-03:00',
  cancelableHasta: '2026-11-05T17:00:00-03:00',
});

const muestra: Reserva[] = [
  reserva('r1', 'confirmada'),
  reserva('r2', 'cancelada'),
  reserva('r3', 'cumplida'),
  reserva('r4', 'ausente'),
  reserva('r5', 'confirmada'),
];

describe('filtrarReservasPorPestania', () => {
  it('en "proximas" deja solo las confirmadas', () => {
    const ids = filtrarReservasPorPestania(muestra, 'proximas').map((r) => r.id);
    expect(ids).toEqual(['r1', 'r5']);
  });

  it('en "pasadas" deja cumplidas, canceladas y ausentes', () => {
    const ids = filtrarReservasPorPestania(muestra, 'pasadas').map((r) => r.id);
    expect(ids).toEqual(['r2', 'r3', 'r4']);
  });

  it('con lista vacía devuelve vacía en ambas pestañas', () => {
    expect(filtrarReservasPorPestania([], 'proximas')).toEqual([]);
    expect(filtrarReservasPorPestania([], 'pasadas')).toEqual([]);
  });
});

describe('contarReservasActivas', () => {
  it('cuenta solo las confirmadas (límite de 3 del PRD)', () => {
    expect(contarReservasActivas(muestra)).toBe(2);
    expect(contarReservasActivas([])).toBe(0);
  });
});
