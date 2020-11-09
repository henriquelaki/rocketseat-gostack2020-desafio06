import { getRepository, getCustomRepository } from 'typeorm';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';
interface Request {
  id: string;
}
class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const transaction = await transactionsRepository.findOne(id);
    await transactionsRepository.delete(id);

    if (transaction) {
      const { category_id } = transaction;
      const [
        ,
        countTransactionsWithSameCategory,
      ] = await transactionsRepository.findAndCount({
        category_id
      });

      if (!countTransactionsWithSameCategory) {
        await categoriesRepository.delete(category_id);
      }

    }
  }
}

export default DeleteTransactionService;
