import { getRepository, getCustomRepository, In } from 'typeorm';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import AppError from '../errors/AppError';
import uploadConfig from '../configs/upload';
import path from 'path';
import fs from 'fs';
import csvParse from 'csv-parse';

interface CSVTransactions {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}
interface Request {
  transactionsFilename: string;
}
class ImportTransactionsService {
  async execute({ transactionsFilename }: Request): Promise<Transaction[]> {
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const transactionsFilePath = path.join(
      uploadConfig.directory,
      transactionsFilename,
    );

    const transactionFilesExists = await fs.promises.stat(transactionsFilePath);

    if (!transactionFilesExists) {
      throw new AppError('Uploaded file not found');
    }

    const transactions = [] as CSVTransactions[];
    const categories = [] as string[];

    const readTransactionsFileStream = fs.createReadStream(
      transactionsFilePath,
    );

    const parsers = csvParse({
      from_line: 2,
    });

    const parseTransactionsFile = readTransactionsFileStream.pipe(parsers);

    parseTransactionsFile.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value || !category) {
        return;
      }

      categories.push(category);
      transactions.push({ title, type, value, category } as CSVTransactions);
    });

    await new Promise<void>(resolve => {
      parseTransactionsFile.on('end', resolve);
    });

    await fs.promises.unlink(transactionsFilePath);

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);
    return createdTransactions;
  }
}

export default ImportTransactionsService;
