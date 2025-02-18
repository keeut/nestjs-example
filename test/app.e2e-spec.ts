import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { userIdType } from 'src/user/entities/user-constant';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let userRepository: Repository<User>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          synchronize: true,
          dropSchema: true,
          entities: [User],
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    userRepository = moduleFixture.get(getRepositoryToken(User));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /user/signup', () => {
    it('should sign up a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/user/signup')
        .send({
          userId: 'testuser@example.com',
          password: 'test',
          name: 'Test User',
          idType: userIdType.REG_NO,
          idValue: '123456-1234567',
        })
        .expect(200);
      expect(response.body.resultCode).toBe(200);
      expect(response.body.resultMsg).toBe('OK');
    });
    it('should return conflict error when signup same user', async () => {
      await request(app.getHttpServer())
        .post('/user/signup')
        .send({
          userId: 'testuser@example.com',
          password: 'securePassword123',
          name: 'Test User',
          idType: 'REG_NO',
          idValue: '123456-1234567',
        })
        .expect(200);

      const response = await request(app.getHttpServer())
        .post('/user/signup')
        .send({
          userId: 'testuser@example.com',
          password: 'newPassword123',
          name: 'Test User Again',
          idType: 'REG_NO',
          idValue: '765432-7654321',
        })
        .expect(409); 

      expect(response.body.resultCode).toBe(HttpStatus.CONFLICT);
      expect(response.body.resultMsg).toBe('USER_ALREADY_EXISTS'); 
    });

    it('password and idValue should be encrypted when save in db', async () => {
      const signUpResponse = await request(app.getHttpServer())
        .post('/user/signup')
        .send({
          userId: 'testuser@example.com',
          password: 'securePassword123',
          name: 'Test User',
          idType: 'REG_NO',
          idValue: '123456-1234567',
        })
        .expect(200);

      const user = await userRepository.findOne({
        where: { userId: 'testuser@example.com' },
      });
      expect(user).toBeDefined();
      expect(user?.password).not.toBe('securePassword123');
      expect(user?.idValue).not.toBe('123456-1234567');
    });

    it('should return invalid param error when password | idType | idValue is null', async () => {
      const response = await request(app.getHttpServer())
        .post('/user/signup')
        .send({
          userId: 'testuser@example.com',
          password: null,
          name: 'Test User',
          idType: 'REG_NO',
          idValue: null,
        })
        .expect(400);

      expect(response.body.resultCode).toBe(400);
    });

    it('should return error when idType is not specific value', async () => {
      const response = await request(app.getHttpServer())
        .post('/user/signup')
        .send({
          userId: 'testuser@example.com',
          password: 'securePassword123',
          name: 'Test User',
          idType: 'INVALID_ID_TYPE',
          idValue: '123456-1234567',
        })
        .expect(400);

      expect(response.body.resultCode).toBe(400);
    });
  });
});
