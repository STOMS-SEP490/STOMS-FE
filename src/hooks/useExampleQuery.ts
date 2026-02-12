import { useQuery } from '@tanstack/react-query'
import exampleService from '../services/apiService'
import type { Item } from '../types'

export const useItems = () => {
  return useQuery<Item[], Error>({
    queryKey: ['items'],
    queryFn: () => exampleService.getItems(),
    initialData: [],
  })
}

export const useItem = (id: string | number | undefined) => {
  return useQuery<Item, Error>({
    queryKey: ['item', id],
    queryFn: () => exampleService.getItem(id as string | number),
    enabled: !!id,
  })
}

export default useItems
