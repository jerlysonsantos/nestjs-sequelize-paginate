import { Injectable, Inject } from '@nestjs/common'
import { Sequelize } from 'sequelize-typescript'
import { PAGINATE_OPTIONS } from './paginate.constans'
import { PaginateOptions, PaginateModuleOptions } from './interfaces'
import { FindAndCountOptions } from 'sequelize/types'

@Injectable()
export class PaginateService {
  constructor(
    @Inject(PAGINATE_OPTIONS)
    private options: PaginateModuleOptions,
    private readonly sequelize: Sequelize,
  ) {}

  async findAllPaginate(options: PaginateOptions, optionsSequelize: FindAndCountOptions = {}): Promise<any> {
    const iu = (a: any) => {
      return a === undefined || a === null ? false : a
    }

    let url = iu(options.url) || iu(this.options.url) || null
    const showUrl = iu(options.showUrl) || iu(this.options.showUrl) || null
    const structure = iu(options.structure) || iu(this.options.structure) || null
    const details = iu(options.details) || iu(this.options.details) || null
    const isComplete = details === 'complete'

    const modelName = options.model.name

    const offset = iu(options.offset) || iu(this.options.defaultOffset) || null
    const page = iu(options.page) || iu(this.options.defaultPage) || null
    const path = iu(options.path) || null
    const allowOffset = iu(options.showOffset) || iu(this.options.showOffset) || null
    const end = page * offset
    const start = end - offset

    let totalItems = 0
    let totalPages = 0
    const itemCount = offset

    // Pages
    let nextPage = null
    let prevPage = null

    // Urls
    let nextUrl = null
    let prevUrl = null
    let firstUrl = null
    let lastUrl = null

    // Aux
    let aux: number

    // Data variables
    let payload: { [key: string]: any } = {}
    let items: any[] = []

    const data = await this.sequelize.models[modelName].findAll({
      ...optionsSequelize,
      limit: offset,
      offset: start,
    })

    const rowCountTable: any[] = await this.sequelize.query(`
      WITH RowCountTable AS
      (
         SELECT ROW_NUMBER() OVER ( ORDER BY created_at DESC ) AS 'rowNumber' FROM ${modelName} WHERE deleted_at IS NULL
      )
      SELECT rowNumber
      FROM RowCountTable
      ORDER BY rowNumber DESC
      LIMIT 1
   `)

    const count = rowCountTable[0][0].rowNumber

    totalItems = count
    totalPages = Math.ceil(totalItems / offset)
    items = data

    aux = page + 1
    nextPage = aux <= totalPages ? aux : null
    aux = page - 1
    prevPage = aux >= 1 ? aux : null

    url += path + '?page='

    firstUrl = url + 1
    lastUrl = url + totalPages

    nextPage && (nextUrl = url + nextPage)
    prevPage && (prevUrl = url + prevPage)

    if (allowOffset) {
      nextPage && (nextUrl += '&offset=' + offset)
      prevPage && (prevUrl += '&offset=' + offset)
    }

    const meta = {
      page,
      nextPage,
      prevPage,
    }

    isComplete &&
      ((meta['offset'] = offset),
      (meta['totalItems'] = totalItems),
      (meta['totalPages'] = totalPages),
      (meta['itemCount'] = itemCount))

    const links = {
      nextUrl,
      prevUrl,
    }

    isComplete && ((links['firstUrl'] = firstUrl), (links['lastUrl'] = lastUrl))

    switch (structure) {
      case 'segmented':
        payload = {
          meta,
          items,
        }
        showUrl && (payload['links'] = links)
        break
      case 'simple':
      default:
        payload = {
          ...meta,
          items,
        }
        showUrl &&
          (payload = {
            ...payload,
            ...links,
          })
        break
    }

    return payload
  }
}
