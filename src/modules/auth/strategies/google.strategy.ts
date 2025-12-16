import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    // If Google OAuth is not configured, use dummy values to prevent errors
    // The guard will prevent access to these endpoints anyway
    const logger = new Logger(GoogleStrategy.name);
    if (!clientID || clientID === 'your-google-client-id' || !clientSecret) {
      logger.warn(
        'Google OAuth credentials not configured. Google login will not be available.',
      );
    }

    super({
      clientID: clientID || 'dummy-client-id',
      clientSecret: clientSecret || 'dummy-client-secret',
      callbackURL: callbackURL || 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;

    const user = {
      googleId: id,
      email: emails[0].value,
      fullName: `${name.givenName} ${name.familyName}`,
      avatarUrl: photos[0]?.value,
      accessToken,
      refreshToken,
    };

    done(null, user);
  }
}
