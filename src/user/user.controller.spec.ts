import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ConflictException } from '@nestjs/common';
import { userIdType } from './entities/user-constant';

const mockUserService = {
  findOne: jest.fn(),
  create: jest.fn(),
  signIn: jest.fn(),
};

describe('UserController', () => {
  let userController: UserController;
  let userService: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    userController = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /user/signup', () => {
    it('should sign up a new user if user does not exist', async () => {
      const createUserDto: CreateUserDto = {
        userId: 'testuser@example.com',
        password: 'Test1234!',
        name: 'Test User',
        idType: userIdType.REG_NO,
        idValue: '123456-1234567',
      };

      mockUserService.findOne.mockResolvedValue(null);

      await userController.create(createUserDto);

      expect(userService.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should throw a conflict error if the user already exists', async () => {
      const createUserDto: CreateUserDto = {
        userId: 'testuser@example.com',
        password: 'Test1234!',
        name: 'Test User',
        idType: userIdType.REG_NO,
        idValue: '123456-1234567',
      };

      mockUserService.findOne.mockResolvedValue({
        userId: 'testuser@example.com',
      });

      try {
        await userController.create(createUserDto);
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect(error.message).toBe('USER_ALREADY_EXISTS');
      }
    });
  });

  describe('POST /user/login', () => {
    it('should call userService.signIn with correct parameters', async () => {
      const signInDto = {
        userId: 'testuser@example.com',
        password: 'Test1234!',
      };

      const signInResponse = { token: 'jwt-token' };
      mockUserService.signIn.mockResolvedValue(signInResponse);

      const result = await userController.signIn(signInDto);

      expect(userService.signIn).toHaveBeenCalledWith(
        signInDto.userId,
        signInDto.password,
      );
      expect(result).toEqual(signInResponse);
    });
  });
});
