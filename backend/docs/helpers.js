export const json = (schema, example) => ({
  'application/json': { schema, ...(example ? { example } : {}) },
});

export const ok = (description, schema, example) => ({
  description,
  content: json(schema, example),
});

/** { message: "..." } — the shape most write endpoints return. */
export const messageOnly = (description, example) =>
  ok(description, {
    type: 'object',
    properties: { message: { type: 'string', example } },
  });

export const pathId = (name, description) => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'string' },
  description,
});
