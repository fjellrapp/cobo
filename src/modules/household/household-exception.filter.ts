import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { HouseholdDomainError } from './household-domain.error.js';

const statusByCode: Record<string, HttpStatus> = {
  CLIENT_APP_URL_INVALID: HttpStatus.INTERNAL_SERVER_ERROR,
  CLIENT_APP_URL_MISSING: HttpStatus.INTERNAL_SERVER_ERROR,
  CONFIGURATION_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
  HOUSEHOLD_NOT_FOUND: HttpStatus.NOT_FOUND,
  HOUSEHOLD_OWNER_REQUIRED: HttpStatus.FORBIDDEN,
  INVITATION_ALREADY_USED: HttpStatus.CONFLICT,
  INVITATION_EXPIRED: HttpStatus.CONFLICT,
  INVITATION_NOT_FOUND: HttpStatus.NOT_FOUND,
  INVITATION_REVOKED: HttpStatus.CONFLICT,
  INVITATION_RATE_LIMITED: HttpStatus.TOO_MANY_REQUESTS,
  LAST_OWNER_REQUIRED: HttpStatus.FORBIDDEN,
  MEMBER_NOT_ACTIVE: HttpStatus.NOT_FOUND,
  MEMBERSHIP_SELF_DELETE_ONLY: HttpStatus.FORBIDDEN,
  VALIDATION_ERROR: HttpStatus.BAD_REQUEST,
};

@Catch(HouseholdDomainError)
export class HouseholdExceptionFilter implements ExceptionFilter {
  catch(exception: HouseholdDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response
      .status(statusByCode[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ code: exception.code, message: exception.message });
  }
}
