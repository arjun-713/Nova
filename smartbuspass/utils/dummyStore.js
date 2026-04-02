const dummyRoutes = [
  {
    route_id: 1,
    route_name: 'Route A - City Express',
    start_point: 'Central Station',
    end_point: 'Tech Park Gate 1',
    distance_km: 18.5,
    stops: ['Market Square', 'University Road', 'IT Hub'],
    fee_amount: 450,
    is_active: 1
  },
  {
    route_id: 2,
    route_name: 'Route B - North Line',
    start_point: 'Railway Station',
    end_point: 'North Campus',
    distance_km: 12.0,
    stops: ['Bus Stand', 'Government Hospital', 'Park Junction'],
    fee_amount: 350,
    is_active: 1
  },
  {
    route_id: 3,
    route_name: 'Route C - South Connect',
    start_point: 'Airport Road',
    end_point: 'South Mall',
    distance_km: 22.3,
    stops: ['Electronic City', 'Silk Board', 'Adugodi'],
    fee_amount: 550,
    is_active: 1
  }
];

const dummyPasses = [];
let nextDummyPassId = 1;
let nextDummyRouteId = 4;

function createDummyPass(pass) {
  const item = { pass_id: nextDummyPassId++, ...pass };
  dummyPasses.push(item);
  return item;
}

function createDummyRoute(route) {
  const item = { route_id: nextDummyRouteId++, is_active: 1, ...route };
  dummyRoutes.push(item);
  return item;
}

module.exports = {
  dummyRoutes,
  dummyPasses,
  createDummyPass,
  createDummyRoute
};
