import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getJwtConfig } from '../config/jwt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}
  async create(createUserDto: CreateUserDto) {
    return await this.userRepository.save({
      ...createUserDto,
      password: bcrypt.hashSync(createUserDto.password, 10),
      idValue: bcrypt.hashSync(createUserDto.idValue, 10),
    });
  }

  async findOne(userId: string) {
    return await this.userRepository.findOne({ where: { userId } });
  }

  async signIn(userId: string, pass: string): Promise<any> {
    const user = await this.findOne(userId);
    if (!user) {
      throw new UnauthorizedException();
    }

    const isSamePassword = bcrypt.compareSync(pass, user.password);
    if (!isSamePassword) {
      throw new UnauthorizedException('이메일 또는 비밀번호를 확인해 주세요.');
    }

    const payload: Record<string, any> = {};
    getJwtConfig(this.configService).jwtContents.forEach((item) => {
      payload[item] = user[item];
    });
    console.log(payload);

    return {
      token: await this.jwtService.signAsync(payload, {
        expiresIn: getJwtConfig(this.configService).jwtExpiresIn,
        secret: getJwtConfig(this.configService).secret,
      }),
    };
  }
}
