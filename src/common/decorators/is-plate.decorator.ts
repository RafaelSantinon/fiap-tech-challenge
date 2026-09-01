import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isValidPlate } from '../utils/plate.util';

@ValidatorConstraint({ name: 'isPlate', async: false })
export class IsPlateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isValidPlate(value);
  }

  defaultMessage(): string {
    return 'Placa inválida.';
  }
}

export function IsPlate(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPlateConstraint,
    });
  };
}
