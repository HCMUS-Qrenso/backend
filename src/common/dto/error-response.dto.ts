import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error message or array of error messages',
    example: 'Invalid credentials',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  message: string | string[];

  @ApiProperty({
    description: 'Error type/name',
    example: 'Bad Request',
  })
  error: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when the error occurred',
    example: '2025-12-13T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'API endpoint path where the error occurred',
    example: '/auth/login',
  })
  path: string;
}
