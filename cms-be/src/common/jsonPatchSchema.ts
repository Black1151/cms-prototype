export const jsonPatchSchema = {
  name: 'json_patch',
  schema: {
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: false,
      properties: {
        op: { type: 'string', enum: ['replace', 'add', 'remove'] },
        path: { type: 'string', pattern: '^(/([^/~]|~0|~1)+)+$' },
        value: {}
      },
      required: ['op', 'path'],
      allOf: [
        {
          if: { properties: { op: { const: 'remove' } } },
          then: { not: { required: ['value'] } },
          else: { required: ['value'] }
        }
      ]
    }
  }
};


