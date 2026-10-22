import {
  APIError,
  AuthenticationError,
  ERROR_CODES,
  NotFoundError,
  PermissionError,
  RateLimitError,
  ServerError,
  ValidationError,
  throwForStatus,
  unwrapDetail,
} from '../errors.js';
import * as serverIndex from '../index.js';

function thrown(status: number, body: unknown, headers: Record<string, string> = {}): APIError {
  try {
    throwForStatus(status, body, new Headers(headers));
  } catch (err) {
    return err as APIError;
  }
  throw new Error(`throwForStatus(${status}) did not throw`);
}

// Verbatim live /v1 body + header, captured 2026-10-21 from the real server.
const LIVE_401_BODY = JSON.parse(
  '{"detail":{"error":{"type":"authentication_error","code":"missing_api_key","message":"Authorization required. Provide a Bearer qk_ API key or a valid JWT token.","doc_url":"https://docs.querri.com/api/errors#missing_api_key"}}}',
);
const LIVE_401_HEADERS = { 'X-Request-Id': 'req_bcd3adccd74d40429159b73182bd6962' };

const PERMISSION_DENIED_BODY = JSON.parse(
  '{"detail":{"error":{"type":"permission_error","code":"permission_denied","message":"This action needs the dashboards.list.view permission.","permission":"dashboards.list.view","reason":"role_denied","doc_url":"https://docs.querri.com/api/errors#permission_denied"}}}',
);

const ROLE_DISABLED_BODY = JSON.parse(
  '{"detail":{"error":{"type":"permission_error","code":"role_disabled","message":"That role is a draft; an admin must enable it first.","doc_url":"https://docs.querri.com/api/errors#role_disabled"}}}',
);

const PYDANTIC_422_BODY = JSON.parse(
  '{"detail":[{"type":"greater_than_equal","loc":["body","ttl"],"msg":"Input should be greater than or equal to 900","input":1}]}',
);

describe('APIError envelope parsing', () => {
  it('reads the verbatim live 401 body', () => {
    const err = thrown(401, LIVE_401_BODY, LIVE_401_HEADERS);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.status).toBe(401);
    expect(err.type).toBe('authentication_error');
    expect(err.code).toBe(ERROR_CODES.MISSING_API_KEY);
    expect(err.message).toBe(
      'Authorization required. Provide a Bearer qk_ API key or a valid JWT token.',
    );
    expect(err.docUrl).toBe('https://docs.querri.com/api/errors#missing_api_key');
    expect(err.requestId).toBe('req_bcd3adccd74d40429159b73182bd6962');
    expect(err.permission).toBeUndefined();
    expect(err.reason).toBeUndefined();
  });

  it('keeps `body` as the raw wire body, not the unwrapped one', () => {
    const err = thrown(401, LIVE_401_BODY, LIVE_401_HEADERS);
    expect(err.body).toBe(LIVE_401_BODY);
    expect(err.body).toHaveProperty('detail.error.code', 'missing_api_key');
  });

  it('reads permission and reason from a permission_denied body', () => {
    const err = thrown(403, PERMISSION_DENIED_BODY, {
      'X-Permission-Denied': 'dashboards.list.view',
    });
    expect(err).toBeInstanceOf(PermissionError);
    expect(err.code).toBe(ERROR_CODES.PERMISSION_DENIED);
    expect(err.type).toBe('permission_error');
    expect(err.permission).toBe('dashboards.list.view');
    expect(err.reason).toBe('role_denied');
    expect(err.message).toBe('This action needs the dashboards.list.view permission.');
  });

  it('prefers the body permission over the header', () => {
    const err = thrown(403, PERMISSION_DENIED_BODY, { 'X-Permission-Denied': 'other.key' });
    expect(err.permission).toBe('dashboards.list.view');
  });

  it('falls back to the X-Permission-Denied header when the body has no permission', () => {
    const err = thrown(
      403,
      { detail: { error: { type: 'permission_error', code: 'permission_denied', message: 'No.' } } },
      { 'X-Permission-Denied': 'sources.view' },
    );
    expect(err.permission).toBe('sources.view');
    expect(err.reason).toBeUndefined();
  });

  it('reads the header permission and a generic message when the body is null', () => {
    const err = thrown(403, null, { 'X-Permission-Denied': 'sources.view' });
    expect(err).toBeInstanceOf(PermissionError);
    expect(err.message).toBe('Request failed with status 403');
    expect(err.permission).toBe('sources.view');
    expect(err.code).toBeUndefined();
    expect(err.body).toBeNull();
  });

  it('ignores an X-Permission-Denied header that carries an error code, not a key', () => {
    const err = thrown(
      403,
      {
        detail: {
          error: {
            code: 'permission_denied',
            reason: 'scope_exceeds_role',
            scopes: ['*'],
          },
        },
      },
      { 'x-permission-denied': 'permission_denied' },
    );
    expect(err.code).toBe('permission_denied');
    expect(err.reason).toBe('scope_exceeds_role');
    expect(err.permission).toBeUndefined();
  });

  it('reads a dotted X-Permission-Denied header when the body is not JSON', () => {
    const err = thrown(403, '<html>Forbidden</html>', {
      'x-permission-denied': 'dashboards.list.view',
    });
    expect(err).toBeInstanceOf(PermissionError);
    expect(err.permission).toBe('dashboards.list.view');
  });

  it('reads the code from the in-app flat shape ({detail: {error: string, …}})', () => {
    const err = thrown(403, {
      detail: {
        error: 'permission_denied',
        permission: 'dashboards.list.view',
        reason: 'role_denied',
        layer: 'role',
      },
    });
    expect(err.code).toBe('permission_denied');
    expect(err.permission).toBe('dashboards.list.view');
    expect(err.reason).toBe('role_denied');
  });

  it('does not treat a human message in a flat `error` string as a code', () => {
    const err = thrown(403, { error: 'You cannot do that.' });
    expect(err.message).toBe('You cannot do that.');
    expect(err.code).toBeUndefined();
  });

  it('reads the human `message` beside a code-shaped `error` string', () => {
    const err = thrown(400, {
      detail: { error: 'too_many_attachments', message: 'Human msg' },
    });
    expect(err.code).toBe('too_many_attachments');
    expect(err.message).toBe('Human msg');
  });

  it('does not read a code from a top-level legacy `{error: string}` body', () => {
    const err = thrown(403, { error: 'forbidden' });
    expect(err.message).toBe('forbidden');
    expect(err.code).toBeUndefined();
  });

  it('reads a code from the same flat string when it came wrapped in `detail`', () => {
    const err = thrown(403, { detail: { error: 'forbidden' } });
    expect(err.code).toBe('forbidden');
  });

  it('keeps a top-level string `error` over a string `detail` (as in 1.0.1)', () => {
    const err = thrown(400, { error: 'x', detail: 'y' });
    expect(err.message).toBe('x');
    expect(err.code).toBeUndefined();
  });

  it('keeps a top-level error object over a string `detail`', () => {
    const err = thrown(403, {
      error: {
        type: 'permission_error',
        code: 'permission_denied',
        message: 'No.',
        doc_url: 'https://docs.querri.com/api/errors#permission_denied',
      },
      detail: 'd',
    });
    expect(err.code).toBe('permission_denied');
    expect(err.type).toBe('permission_error');
    expect(err.docUrl).toBe('https://docs.querri.com/api/errors#permission_denied');
    expect(err.message).toBe('No.');
  });

  it('keeps a top-level error over a Pydantic-style list `detail`', () => {
    const err = thrown(422, { error: 'bad_input', detail: [{ loc: ['body'], msg: 'x' }] });
    expect(err.type).toBeUndefined();
    expect(err.message).toBe('bad_input');
  });

  it('does not take the header permission for a refusal that is not permission_denied', () => {
    const err = thrown(
      403,
      {
        detail: {
          error: {
            type: 'permission_error',
            code: 'escalation_denied',
            message: 'You cannot grant permissions you lack.',
            missing: ['dashboards.list.view'],
          },
        },
      },
      { 'x-permission-denied': 'dashboards.list.view' },
    );
    expect(err.code).toBe(ERROR_CODES.ESCALATION_DENIED);
    expect(err.permission).toBeUndefined();
    expect((err.body as any).detail.error.missing).toEqual(['dashboards.list.view']);
  });

  it('takes the header permission for a permission_denied code without a body permission', () => {
    const err = thrown(
      403,
      { detail: { error: { code: 'permission_denied', message: 'No.' } } },
      { 'x-permission-denied': 'org.admin' },
    );
    expect(err.permission).toBe('org.admin');
  });

  it('reads an embed role error (403 role_disabled)', () => {
    const err = thrown(403, ROLE_DISABLED_BODY);
    expect(err).toBeInstanceOf(PermissionError);
    expect(err.code).toBe(ERROR_CODES.ROLE_DISABLED);
    expect(err.message).toBe('That role is a draft; an admin must enable it first.');
    expect(err.docUrl).toBe('https://docs.querri.com/api/errors#role_disabled');
    expect(err.permission).toBeUndefined();
  });

  it('reads role_not_found as a NotFoundError', () => {
    const err = thrown(404, {
      detail: {
        error: {
          type: 'not_found_error',
          code: 'role_not_found',
          message: 'No role "nope" in this organization.',
          doc_url: 'https://docs.querri.com/api/errors#role_not_found',
        },
      },
    });
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.type).toBe('not_found_error');
    expect(err.code).toBe(ERROR_CODES.ROLE_NOT_FOUND);
  });

  it('reads a flat detail object ({detail: {type, code, message}})', () => {
    const err = thrown(409, {
      detail: { type: 'conflict_error', code: 'org_mismatch', message: 'Wrong org.' },
    });
    expect(err.code).toBe('org_mismatch');
    expect(err.type).toBe('conflict_error');
    expect(err.message).toBe('Wrong org.');
  });

  it('reads a string detail as the message', () => {
    const err = thrown(500, { detail: 'Internal Server Error' });
    expect(err).toBeInstanceOf(ServerError);
    expect(err.message).toBe('Internal Server Error');
    expect(err.code).toBeUndefined();
  });

  it('maps Pydantic 422 to ValidationError with a readable message', () => {
    const err = thrown(422, PYDANTIC_422_BODY);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.status).toBe(422);
    expect(err.type).toBe('validation_error');
    expect(err.message).toBe(
      'Validation failed: body.ttl: Input should be greater than or equal to 900',
    );
    expect(err.body).toBe(PYDANTIC_422_BODY);
  });

  it('joins several Pydantic errors', () => {
    const err = thrown(422, {
      detail: [
        { type: 'missing', loc: ['body', 'user_id'], msg: 'Field required' },
        { type: 'string_too_long', loc: ['body', 'role'], msg: 'String should have at most 100 characters' },
      ],
    });
    expect(err.message).toBe(
      'Validation failed: body.user_id: Field required; body.role: String should have at most 100 characters',
    );
  });

  it('keeps 400 as ValidationError with status 400', () => {
    const err = thrown(400, {
      detail: { error: { type: 'invalid_request_error', code: 'invalid_parameters', message: 'Bad scope.' } },
    });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.status).toBe(400);
    expect(err.code).toBe('invalid_parameters');
  });

  it('still reads flat { error: string, code } bodies', () => {
    const err = thrown(403, { error: 'Forbidden', code: 'permission_denied' });
    expect(err.message).toBe('Forbidden');
    expect(err.code).toBe('permission_denied');
  });

  it('still reads Stripe-style { error: {…} } bodies without detail', () => {
    const err = thrown(429, {
      error: { type: 'rate_limit_error', code: 'rate_limit_exceeded', message: 'Slow down.' },
    }, { 'retry-after': '2' });
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfter).toBe(2);
    expect(err.code).toBe('rate_limit_exceeded');
    expect(err.message).toBe('Slow down.');
  });
});

describe('unwrapDetail', () => {
  it('passes non-detail bodies through unchanged', () => {
    const flat = { error: 'x' };
    expect(unwrapDetail(flat)).toBe(flat);
    expect(unwrapDetail(null)).toBeNull();
    expect(unwrapDetail('text')).toBe('text');
  });
});

describe('ERROR_CODES', () => {
  it('lists every documented code once, with matching values', () => {
    const values = Object.values(ERROR_CODES);
    expect(new Set(values).size).toBe(values.length);
    for (const [key, value] of Object.entries(ERROR_CODES)) {
      expect(key).toBe(value.toUpperCase());
    }
    expect(values).toEqual(
      expect.arrayContaining([
        'missing_api_key',
        'permission_denied',
        'insufficient_scope',
        'role_not_found',
        'role_not_allowed',
        'role_disabled',
        'seat_change_required',
        'origin_required',
        'origin_not_allowed',
        'rate_limit_exceeded',
        'escalation_denied',
        'last_admin',
        'invalid_parameters',
      ]),
    );
    expect(values).toHaveLength(26);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(ERROR_CODES)).toBe(true);
    expect(() => {
      (ERROR_CODES as Record<string, string>).MISSING_API_KEY = 'changed';
    }).toThrow(TypeError);
  });

  it('is exported from the server entry point', () => {
    expect(serverIndex.ERROR_CODES).toBe(ERROR_CODES);
  });
});
