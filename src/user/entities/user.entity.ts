import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { userIdType } from './user-constant';
import { Transfer } from '../../transfer/entities/transfer.entity';
import { Quote } from '../../transfer/entities/quote.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  idx: number;

  @Column({
    unique: true,
  })
  userId: string;

  @Column({
    nullable: true,
  })
  name: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: userIdType,
    default: userIdType.REG_NO,
  })
  idType: userIdType;

  @Column()
  idValue: string;

  @CreateDateColumn()
  registeredAt: Date;

  @OneToMany(() => Transfer, (transfer) => transfer.user)
  transfers: Transfer[];

  @OneToMany(() => Quote, (quote) => quote.user)
  quotes: Transfer[];
}
