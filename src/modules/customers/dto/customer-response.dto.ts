import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from '../../../common/enums/document-type.enum';
import { Customer } from '../entities/customer.entity';

export class CustomerResponseDto {
  @ApiProperty({ example: 'b3f1c2a4-5d6e-7f80-91a2-b3c4d5e6f708' })
  id: string;

  @ApiProperty({ example: 'Maria Souza' })
  name: string;

  @ApiProperty({ example: '52998224725' })
  document: string;

  @ApiProperty({ enum: DocumentType, example: DocumentType.CPF })
  documentType: DocumentType;

  @ApiProperty({ example: 'maria@email.com' })
  email: string;

  @ApiProperty({ example: '(11) 98888-7777', nullable: true })
  phone: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(customer: Customer): CustomerResponseDto {
    const dto = new CustomerResponseDto();
    dto.id = customer.id;
    dto.name = customer.name;
    dto.document = customer.document;
    dto.documentType = customer.documentType;
    dto.email = customer.email;
    dto.phone = customer.phone;
    dto.isActive = customer.isActive;
    dto.createdAt = customer.createdAt;
    dto.updatedAt = customer.updatedAt;
    return dto;
  }
}
