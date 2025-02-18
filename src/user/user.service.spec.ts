import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

describe('UserService', () => {
  let userService: UserService;
  let userRepository: any;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should hash password and idValue before saving user', async () => {
      const createUserDto = {
        userId: 'testuser@example.com',
        password: 'Test1234!',
        name: 'Test User',
        idType: 'REG_NO',
        idValue: '123456-1234567',
      } as CreateUserDto;

      const hashedPassword = 'hashedPassword';
      const hashedIdValue = 'hashedIdValue';

      const hashSpy = jest
        .spyOn(bcrypt, 'hashSync')
        .mockReturnValueOnce(hashedPassword)
        .mockReturnValueOnce(hashedIdValue);

      const saveUser = {
        ...createUserDto,
        password: hashedPassword,
        idValue: hashedIdValue,
      };

      userRepository.save = jest.fn().mockResolvedValue(saveUser);

      const result = await userService.create(createUserDto);

      expect(hashSpy).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(hashSpy).toHaveBeenCalledWith(createUserDto.idValue, 10);
      expect(userRepository.save).toHaveBeenCalledWith(saveUser);
      expect(result).toEqual(saveUser);
    });
  });

  describe('findOne', () => {
    it('should return a user if found', async () => {
      const userId = 'testuser@example.com';
      const user = { userId, password: 'hashedPassword', name: 'Test User' };

      userRepository.findOne = jest.fn().mockResolvedValue(user);

      const result = await userService.findOne(userId);

      expect(result).toEqual(user);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should return null if no user found', async () => {
      const userId = 'testuser@example.com';

      userRepository.findOne = jest.fn().mockResolvedValue(null);

      const result = await userService.findOne(userId);

      expect(result).toBeNull();
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });

  describe('signIn', () => {
    it('should throw UnauthorizedException if user is not found', async () => {
      const userId = 'unexisttestuser@example.com';
      const password = 'Test1234!';

      userRepository.findOne = jest.fn().mockResolvedValue(null);  

      await expect(userService.signIn(userId, password)).rejects.toThrowError(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const userId = 'testuser@example.com';
      const password = 'Test1234!';
      const user = { userId, password: 'hashedPassword', name: 'Test User' };

      userRepository.findOne = jest.fn().mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compareSync').mockReturnValue(false);

      await expect(userService.signIn(userId, password)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return a JWT token if login is successful', async () => {
      const userId = 'testuser@example.com';
      const password = 'Test1234!';
      const user = { userId, password: 'hashedPassword', name: 'Test User' };

      userRepository.findOne = jest.fn().mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compareSync').mockReturnValue(true);

      const mockPayload = { userId: user.userId, name: user.name };
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('mock-jwt-token');

      const result = await userService.signIn(userId, password);

      expect(jwtService.signAsync).toHaveBeenCalledWith(mockPayload, {
        expiresIn: configService.get('JWT_EXPIRES_IN'),
        secret: configService.get('JWT_SECRET_KEY'),
      });
      expect(result).toEqual({ token: 'mock-jwt-token' });
    });
  });
});
