const request = require('supertest');
const app = require('./server');

describe('testy jednostkowe endpointow', () => {
    // test dla endpointu health
    it('endpoint /health powinien zwrocic status 200 i poprawne dane', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('instanceId');
    });

    // test dla endpointu stats
    it('endpoint /stats powinien zwrocic poprawne pole totalProducts', async () => {
        const res = await request(app).get('/stats');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('totalProducts');
    });
});
