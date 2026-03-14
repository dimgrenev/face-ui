import { describe, it, expect } from 'vitest'
import { ListCollection, fromStrings, fromItems, createTypeahead } from '../collection'

describe('ListCollection', () => {
  const items = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry', disabled: true },
    { value: 'date', label: 'Date' },
  ]

  it('reports correct size', () => {
    const coll = new ListCollection({ items })
    expect(coll.size).toBe(4)
  })

  it('getItem returns item by value', () => {
    const coll = new ListCollection({ items })
    expect(coll.getItem('banana')?.label).toBe('Banana')
    expect(coll.getItem('unknown')).toBeUndefined()
  })

  it('has() checks existence', () => {
    const coll = new ListCollection({ items })
    expect(coll.has('apple')).toBe(true)
    expect(coll.has('unknown')).toBe(false)
  })

  it('indexOf returns correct index', () => {
    const coll = new ListCollection({ items })
    expect(coll.indexOf('cherry')).toBe(2)
    expect(coll.indexOf('unknown')).toBe(-1)
  })

  it('at() returns item by index', () => {
    const coll = new ListCollection({ items })
    expect(coll.at(0)?.value).toBe('apple')
    expect(coll.at(3)?.value).toBe('date')
  })

  it('first/last return correct items', () => {
    const coll = new ListCollection({ items })
    expect(coll.first()?.value).toBe('apple')
    expect(coll.last()?.value).toBe('date')
  })

  it('next() navigates with loop', () => {
    const coll = new ListCollection({ items })
    expect(coll.next('banana')?.value).toBe('date') // skips disabled cherry
    expect(coll.next('date')?.value).toBe('apple') // loops
  })

  it('next() without loop stops at end', () => {
    const coll = new ListCollection({ items })
    expect(coll.next('date', { loop: false })?.value).toBeUndefined() // date is last enabled, no loop
    expect(coll.next('banana', { loop: false })?.value).toBe('date') // banana -> date (skips disabled cherry)
  })

  it('prev() navigates with loop', () => {
    const coll = new ListCollection({ items })
    expect(coll.prev('banana')?.value).toBe('apple')
    expect(coll.prev('apple')?.value).toBe('date') // loops, skips cherry
  })

  it('firstEnabled/lastEnabled skip disabled', () => {
    const coll = new ListCollection({ items })
    expect(coll.firstEnabled()?.value).toBe('apple')
    expect(coll.lastEnabled()?.value).toBe('date')
  })

  it('search() filters by label', () => {
    const coll = new ListCollection({ items })
    expect(coll.search('an').map((i) => i.value)).toEqual(['banana'])
    expect(coll.search('a').map((i) => i.value)).toEqual(['apple', 'banana', 'date'])
  })

  it('filter() with custom predicate', () => {
    const coll = new ListCollection({ items })
    expect(coll.filter((i) => !i.disabled).length).toBe(3)
  })

  it('getGroups() groups items', () => {
    const grouped = new ListCollection({
      items: [
        { value: 'a', label: 'A', group: 'fruits' },
        { value: 'b', label: 'B', group: 'fruits' },
        { value: 'c', label: 'C', group: 'veggies' },
      ],
    })
    const groups = grouped.getGroups()
    expect(groups.length).toBe(2)
    expect(groups[0].label).toBe('fruits')
    expect(groups[0].items.length).toBe(2)
  })

  it('toString() converts value to label', () => {
    const coll = new ListCollection({ items })
    expect(coll.toString('banana')).toBe('Banana')
    expect(coll.toString('unknown')).toBe('')
  })

  it('setItems() returns new collection', () => {
    const coll = new ListCollection({ items })
    const newColl = coll.setItems([{ value: 'x', label: 'X' }])
    expect(newColl.size).toBe(1)
    expect(coll.size).toBe(4) // original unchanged
  })
})

describe('fromStrings', () => {
  it('creates collection from string array', () => {
    const coll = fromStrings(['a', 'b', 'c'])
    expect(coll.size).toBe(3)
    expect(coll.getItem('a')?.label).toBe('a')
  })
})

describe('fromItems', () => {
  it('creates collection with custom accessors', () => {
    const coll = fromItems([{ value: 'x', label: 'X' }])
    expect(coll.size).toBe(1)
  })
})

describe('createTypeahead', () => {
  it('accumulates characters', () => {
    const typeahead = createTypeahead({ timeout: 100 })
    expect(typeahead.handle('a')).toBe('a')
    expect(typeahead.handle('b')).toBe('ab')
  })

  it('reset clears state', () => {
    const typeahead = createTypeahead({ timeout: 100 })
    typeahead.handle('a')
    typeahead.reset()
    expect(typeahead.handle('b')).toBe('b')
  })
})
