import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app';
import { createMemoryRepository } from './memoryRepository';

const startAt = '2030-01-01T10:00:00.000Z';

describe('app', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp(createMemoryRepository());
  });

  async function createEvent() {
    const res = await request(app)
      .post('/api/events')
      .send({ title: '忘年会', candidates: [{ startAt }] });
    expect(res.status).toBe(201);
    return res.body as { eventId: string; manageToken: string };
  }

  async function candidateIdOf(eventId: string): Promise<string> {
    const res = await request(app).get(`/api/events/${eventId}`);
    return res.body.candidates[0].id;
  }

  it('ヘルスチェックに応答する', async () => {
    const res = await request(app).get('/api/healthz');
    expect(res.status).toBe(200);
  });

  it('イベントを作成して取得できる', async () => {
    const { eventId } = await createEvent();
    const res = await request(app).get(`/api/events/${eventId}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('忘年会');
    expect(res.body).not.toHaveProperty('manageTokenHash');
    expect(res.headers).not.toHaveProperty('x-powered-by');
  });

  it('存在しないイベントは 404 NOT_FOUND', async () => {
    const res = await request(app).get('/api/events/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('未定義のルートは 404 NOT_FOUND', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('/api の外のパスには API のルートが無い (アセットに当たらなかったものは 404)', async () => {
    const { eventId } = await createEvent();
    const res = await request(app).get(`/events/${eventId}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('入力エラーは 400 VALIDATION とメッセージを返す', async () => {
    const res = await request(app).post('/api/events').send({ title: '', candidates: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({ code: 'VALIDATION', message: 'イベント名を入力してください' });
  });

  it('不正な JSON や型違いは 400 VALIDATION', async () => {
    const broken = await request(app)
      .post('/api/events')
      .set('content-type', 'application/json')
      .send('{');
    expect(broken.status).toBe(400);
    expect(broken.body.error.code).toBe('VALIDATION');

    expect((await request(app).post('/api/events').send([1])).status).toBe(400);
    expect((await request(app).post('/api/events').send({ title: 1, candidates: [] })).status).toBe(
      400,
    );
  });

  it('必須項目の欠落や定義外の回答の値は、形式エラーとして 400 VALIDATION', async () => {
    const formatError = { code: 'VALIDATION', message: 'リクエストの形式が正しくありません' };

    const missing = await request(app)
      .post('/api/events')
      .send({ candidates: [{ startAt }] });
    expect(missing.status).toBe(400);
    expect(missing.body.error).toEqual(formatError);

    const { eventId } = await createEvent();
    const candidateId = await candidateIdOf(eventId);
    const badStatus = await request(app)
      .post(`/api/events/${eventId}/answers`)
      .send({ name: '山田', choices: [{ candidateId, status: 'PERHAPS' }] });
    expect(badStatus.status).toBe(400);
    expect(badStatus.body.error).toEqual(formatError);
  });

  it('管理トークンはヘッダで受け取り、違えば 403', async () => {
    const { eventId, manageToken } = await createEvent();
    const wrong = await request(app)
      .patch(`/api/events/${eventId}`)
      .set('x-manage-token', 'wrong')
      .send({ closed: true });
    expect(wrong.status).toBe(403);

    const ok = await request(app)
      .patch(`/api/events/${eventId}`)
      .set('x-manage-token', manageToken)
      .send({ closed: true });
    expect(ok.status).toBe(200);
    expect(ok.body.closed).toBe(true);
  });

  it('PATCH で fee に null を送ると未設定に戻る', async () => {
    const { eventId, manageToken } = await createEvent();
    const patch = (body: object) =>
      request(app).patch(`/api/events/${eventId}`).set('x-manage-token', manageToken).send(body);

    expect((await patch({ fee: 1000 })).body.fee).toBe(1000);
    // 省略は「変更しない」
    expect((await patch({ title: '新年会' })).body.fee).toBe(1000);
    expect((await patch({ fee: null })).body.fee).toBeNull();
  });

  it('イベントを削除できる', async () => {
    const { eventId, manageToken } = await createEvent();
    const res = await request(app)
      .delete(`/api/events/${eventId}`)
      .set('x-manage-token', manageToken);
    expect(res.status).toBe(204);
    expect((await request(app).get(`/api/events/${eventId}`)).status).toBe(404);
  });

  it('回答の作成・更新・削除ができる', async () => {
    const { eventId } = await createEvent();
    const candidateId = await candidateIdOf(eventId);

    const created = await request(app)
      .post(`/api/events/${eventId}/answers`)
      .send({ name: '山田', choices: [{ candidateId, status: 'YES' }] });
    expect(created.status).toBe(201);
    const { answer, editToken } = created.body;

    const updated = await request(app)
      .put(`/api/answers/${answer.id}`)
      .set('x-edit-token', editToken)
      .send({ name: '山田', choices: [{ candidateId, status: 'NO' }] });
    expect(updated.status).toBe(200);
    expect(updated.body.choices[0].status).toBe('NO');

    const deleted = await request(app)
      .delete(`/api/answers/${answer.id}`)
      .set('x-edit-token', editToken);
    expect(deleted.status).toBe(204);
  });

  it('主催者は管理トークンで回答を削除できる', async () => {
    const { eventId, manageToken } = await createEvent();
    const candidateId = await candidateIdOf(eventId);
    const created = await request(app)
      .post(`/api/events/${eventId}/answers`)
      .send({ name: '山田', choices: [{ candidateId, status: 'YES' }] });

    const res = await request(app)
      .delete(`/api/answers/${created.body.answer.id}`)
      .set('x-manage-token', manageToken);
    expect(res.status).toBe(204);
  });

  it('同名の回答は 409 DUPLICATE_NAME', async () => {
    const { eventId } = await createEvent();
    const candidateId = await candidateIdOf(eventId);
    const submit = () =>
      request(app)
        .post(`/api/events/${eventId}/answers`)
        .send({ name: '山田', choices: [{ candidateId, status: 'YES' }] });

    expect((await submit()).status).toBe(201);
    const res = await submit();
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_NAME');
  });

  it('想定外の例外は詳細を隠して 500 INTERNAL', async () => {
    const repo = createMemoryRepository();
    repo.getEvent = async () => {
      throw new Error('boom');
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // パスに書式指定子を含めても、ログの書式として解釈されないこと
    const res = await request(createApp(repo)).get('/api/events/%25o');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL');
    expect(res.body.error.message).not.toContain('boom');
    expect(spy).toHaveBeenCalledWith(
      'unexpected error:',
      'GET /api/events/%25o',
      expect.objectContaining({ message: 'boom' }),
    );
    spy.mockRestore();
  });

  describe('レート制限', () => {
    it('クライアントの IP ごとに判定し、超えたら 429 RATE_LIMITED', async () => {
      const keys: string[] = [];
      const limitedApp = createApp(createMemoryRepository(), {
        rateLimit: async (key) => {
          keys.push(key);
          return keys.length <= 1;
        },
      });
      const get = () =>
        request(limitedApp).get('/api/healthz').set('cf-connecting-ip', '203.0.113.1');

      expect((await get()).status).toBe(200);
      const res = await get();
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('RATE_LIMITED');
      expect(keys).toEqual(['203.0.113.1', '203.0.113.1']);
    });
  });
});
