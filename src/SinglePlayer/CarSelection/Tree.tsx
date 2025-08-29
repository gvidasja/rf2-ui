import { useEffect, useState } from 'react'
import styles from './CarSelection.module.css'

type Selector<T> = (x: T) => void
type PathGetter<T> = (x: T) => string[]
type KeyGetter<T> = (x: T) => string

export function Tree<T>({
  onSelect,
  selected,
  data,
  getPath,
  getKey,
}: {
  onSelect: Selector<T>
  selected: T
  data: T[]
  getPath: PathGetter<T>
  getKey: KeyGetter<T>
}) {
  const [rootNode, setRootNode] = useState<Node<T>>()

  useEffect(() => {
    if (!data) {
      return
    }

    setRootNode(buildTree(data, getPath, getKey))
  }, [data, getPath, getKey])

  return rootNode ? <TreeView node={rootNode} onSelect={onSelect} selected={selected} getKey={getKey} /> : ''
}

function TreeView<T>({
  node,
  onSelect,
  selected,
  getKey,
}: {
  node: Node<T>
  onSelect: Selector<T>
  selected: T
  getKey: KeyGetter<T>
}) {
  const [expanded, setExpanded] = useState<string>()

  return Object.entries(node.children)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, child]) => (
      <div key={key}>
        <div
          className={getKey(selected) === key ? styles.Selected : ''}
          onClick={(e) => {
            e.stopPropagation()

            if (child.category) {
              setExpanded(key === expanded ? '' : key)
            } else {
              onSelect(child.item!)
            }
          }}
        >
          {key}
        </div>
        <div className={styles.Indent}>
          {!!child.children && key === expanded ? (
            <TreeView node={child} onSelect={onSelect} selected={selected} getKey={getKey} />
          ) : (
            ''
          )}
        </div>
      </div>
    ))
}

interface Node<T> {
  children: Record<string, Node<T>>
  item?: T
  parent?: Node<T>
  category?: string
}

function buildTree<T>(data: T[], getPath: (x: T) => string[], getKey: (x: T) => string) {
  const tree: Node<T> = { children: {} }

  data.forEach((item) => {
    const path = getPath(item)
    let node = tree

    while (path.length > 0) {
      const el = path.shift()!
      node.children[el] = node.children[el] || {
        children: {},
        parent: node,
        category: true,
      }
      node = node.children[el]
    }

    node.children[getKey(item)] = {
      children: {},
      item,
      parent: node,
    }
  })
  return tree
}
