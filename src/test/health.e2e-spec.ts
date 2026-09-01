import { TestApp, bootstrapTestApp } from './support/test-app';

describe('Health (e2e)', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('should answer without a token', async () => {
    const { body } = await ctx.anonymous('get', '/health').expect(200);

    expect(body.status).toBe('ok');
    expect(Date.parse(body.timestamp as string)).not.toBeNaN();
  });
});
