import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { currency } from './transfer-constant';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  quoteId: string;

  @Column()
  amount: number;

  @Column()
  targetAmount: number;

  @Column()
  fee: number;

  @Column()
  usdExchangeRate: number;

  @Column()
  exchangeRate: number;

  @Column()
  usdAmount: number;

  @Column({
    type: 'enum',
    enum: currency,
  })
  targetCurrency: string;

  @Column({type: 'timestamp'})
  expireTime: Date;

  @CreateDateColumn({type: 'timestamp'})
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.quotes)
  @JoinColumn({ name: 'userIdx' })
  user: User;

  @Column()
  userIdx: number;
}
