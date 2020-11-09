import AppError from '../errors/AppError';
import { getRepository, getCustomRepository } from 'typeorm';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}
class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const transactionCategory = await categoriesRepository.findOne({
      where: { title: category },
    });

    let categoryId: string;

    if (!transactionCategory) {
      const newCategory = categoriesRepository.create({
        title: category,
      });

      categoryId = (await categoriesRepository.save(newCategory)).id;
    } else {
      categoryId = transactionCategory.id;
    }

    const { total: balance } = await transactionsRepository.getBalance();

    if (type === 'outcome' && balance < value) {
      throw new AppError('Not enough balance for this transaction', 400);
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: categoryId,
    });

    await transactionsRepository.save(transaction);
    return transaction;
  }
}

export default CreateTransactionService;
