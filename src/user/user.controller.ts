import {
  Controller,
  Post,
  Body,
  ConflictException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { signInDto } from './dto/signin.dto';
import { Public } from '../decorator/public-api.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.OK)
  async create(@Body() createUserDto: CreateUserDto) {
    if (await this.userService.findOne(createUserDto.userId)) {
      throw new ConflictException('USER_ALREADY_EXISTS');
    }
    await this.userService.create(createUserDto);
    return;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() signInDto: signInDto) {
    return await this.userService.signIn(signInDto.userId, signInDto.password);
  }
}
