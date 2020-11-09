import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();
    const incomes = transactions.reduce((sum, transaction) => {
      if (transaction.type === 'income') {
        return sum + transaction.value;
      }
      return sum;
    }, 0);

    const outcomes = transactions.reduce((sum, transaction) => {
      if (transaction.type === 'outcome') {
        return sum + transaction.value;
      }
      return sum;
    }, 0);

    const total = incomes - outcomes;

    const balance = {
      income: incomes,
      outcome: outcomes,
      total,
    };

    return balance;
  }
}

export default TransactionsRepository;
