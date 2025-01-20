import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { EmailDto } from './dto/email.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('user/signup')
  async signup(@Body() emailDto: EmailDto) {
    return this.authService.signup(emailDto.email, emailDto.name);
  }

  @Post('user/confirm')
  async confirm(@Body() otpVerifyDto: OtpVerifyDto) {
    return this.authService.confirm(
      otpVerifyDto.email,
      otpVerifyDto.otp,
      otpVerifyDto.password,
      otpVerifyDto.age,
    );
  }
  @Post('user/login')
  async login(@Body() credentials: LoginDto) {
    return this.authService.login(credentials.email, credentials.password);
  }

  @Post('CMS/login')
  async CMSlogin(@Body() credentials: LoginDto) {
    return this.authService.CMSlogin(credentials.email, credentials.password);
  }

  @Post('author/login')
  async Authorlogin(@Body() credentials: LoginDto) {
    return this.authService.Authorlogin(
      credentials.email,
      credentials.password,
    );
  }
}
