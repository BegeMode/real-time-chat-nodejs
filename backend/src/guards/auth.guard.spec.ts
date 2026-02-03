import { JwtAuthGuard } from '@guards/jwt-auth.guard.js';
import { JwtRefreshAuthGuard } from '@guards/jwt-refresh-auth.guard.js';
import { AuthGuard } from '@nestjs/passport';
import { describe, expect, it } from 'vitest';

describe('Auth Guards', () => {
  describe('JwtAuthGuard', () => {
    it('should be defined', () => {
      const guard = new JwtAuthGuard();
      expect(guard).toBeDefined();
      expect(guard).toBeInstanceOf(AuthGuard('jwt'));
    });
  });

  describe('JwtRefreshAuthGuard', () => {
    it('should be defined', () => {
      const guard = new JwtRefreshAuthGuard();
      expect(guard).toBeDefined();
      expect(guard).toBeInstanceOf(AuthGuard('jwt-refresh'));
    });
  });
});
