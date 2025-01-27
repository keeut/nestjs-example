import { User } from '../../user/entities/user.entity';
import { Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { PrimaryGeneratedColumn } from 'typeorm';

import { Column } from 'typeorm';

import { CreateDateColumn } from 'typeorm';

@Entity('transfer')
export class Transfer {
  @PrimaryGeneratedColumn()
  id: string;

  @Index('quoteId-idx')
  @Column({unique: true})
  quoteId: string;

  @Column()
  sourceAmount: number;

  @Column()
  fee: number;

  @Column()
  usdAmount: number;

  @Column()
  targetCurrency: string;

  @Column()
  usdExchangeRate: number;

  @Column()
  exchangeRate: number;

  @Column()
  targetAmount: number;

  @CreateDateColumn({type: 'timestamp'})
  requestedDate: Date;

  @ManyToOne(() => User, (user) => user.transfers)
  @JoinColumn({ name: 'userIdx' })
  user: User;

  @Index('userIdx-idx')
  @Column()
  userIdx: number;
}
