import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION, type Database } from '../../database/database.module';
import { users, refreshTokens, portfolios } from '../../database/schema';
import { INITIAL_CASH_BALANCE } from '@tradesim/shared';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(email: string, password: string) {
    // Check if user exists
    const existingUser = await this.db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const [newUser] = await this.db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
      })
      .returning();

    // Create portfolio with initial cash balance
    await this.db.insert(portfolios).values({
      userId: newUser.id,
      cashBalance: INITIAL_CASH_BALANCE.toString(),
    });

    // Generate tokens
    return this.generateTokens(newUser.id, newUser.email);
  }

  async login(email: string, password: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user.id, user.email);
  }

  async refresh(refreshToken: string) {
    // Hash the token to look it up
    const tokenHash = await bcrypt.hash(refreshToken, 10);

    // Find the refresh token (we need to compare the hash)
    const storedTokens = await this.db.query.refreshTokens.findMany({
      where: eq(refreshTokens.userId, refreshTokens.userId), // Get all tokens
      with: { user: true },
    });

    let validToken = null;
    for (const token of storedTokens) {
      const isValid = await bcrypt.compare(refreshToken, token.tokenHash);
      if (isValid && new Date(token.expiresAt) > new Date()) {
        validToken = token;
        break;
      }
    }

    if (!validToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Delete the used refresh token (rotation)
    await this.db.delete(refreshTokens).where(eq(refreshTokens.id, validToken.id));

    // Generate new tokens
    return this.generateTokens(validToken.userId, validToken.user.email);
  }

  async logout(userId: string, refreshToken: string) {
    // Find and delete the specific refresh token
    const storedTokens = await this.db.query.refreshTokens.findMany({
      where: eq(refreshTokens.userId, userId),
    });

    for (const token of storedTokens) {
      const isValid = await bcrypt.compare(refreshToken, token.tokenHash);
      if (isValid) {
        await this.db.delete(refreshTokens).where(eq(refreshTokens.id, token.id));
        break;
      }
    }
  }

  private async generateTokens(userId: string, email: string) {
    const payload: JwtPayload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
      expiresIn: '7d',
    });

    // Store hashed refresh token
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.db.insert(refreshTokens).values({
      userId,
      tokenHash,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }

  async validateUser(userId: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return { id: user.id, email: user.email };
  }
}
