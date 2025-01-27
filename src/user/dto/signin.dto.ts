import { IsNotEmpty } from "class-validator";

import { IsEmail } from "class-validator";

import { IsString } from "class-validator";

export class signInDto {
    @IsString()
    @IsEmail()
    userId: string;

    @IsNotEmpty()
    @IsString()
    password: string;
}