import { CustomScalar, Scalar } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { Kind, ValueNode } from 'graphql';

@Scalar('JSON', type => GraphQLJSON)
export class JsonScalar implements CustomScalar<any, any> {
  description = 'JSON custom scalar type';
  parseValue(value: any) { return value; }
  serialize(value: any) { return value; }
  parseLiteral(ast: ValueNode) {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return (ast as any).value;
      case Kind.INT:
      case Kind.FLOAT:
        return parseFloat((ast as any).value);
      case Kind.OBJECT: {
        const value = Object.create(null);
        (ast as any).fields.forEach((f: any) => { value[f.name.value] = this.parseLiteral(f.value); });
        return value;
      }
      case Kind.LIST:
        return (ast as any).values.map((n: any) => this.parseLiteral(n));
      default:
        return null;
    }
  }
}
