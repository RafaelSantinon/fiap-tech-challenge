import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsDocument } from '../../../common/decorators/is-document.decorator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Maria Souza', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    example: '529.982.247-25',
    description: 'CPF ou CNPJ, com ou sem máscara.',
  })
  @IsDocument()
  document: string;

  @ApiProperty({ example: 'maria@email.com', maxLength: 180 })
  @IsEmail()
  @MaxLength(180)
  email: string;

  @ApiProperty({ example: '(11) 98888-7777', maxLength: 20, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
