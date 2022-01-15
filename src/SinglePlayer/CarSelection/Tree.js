import { useState, useEffect } from 'react'
import styles from './CarSelection.module.css'

export function Tree({ onSelect, selected, data, getPath, getKey }) {
  const [rootNode, setRootNode] = useState()

  useEffect(() => {
    if (!data) {
      return
    }

    setRootNode(buildTree(data, getPath, getKey))
  }, [data, getPath, getKey])

  return rootNode ? <TreeView node={rootNode} onSelect={onSelect} selected={selected} getKey={getKey} /> : ''
}

function TreeView({ node, onSelect, selected, getKey }) {
  const [expanded, setExpanded] = useState()

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
              onSelect(child)
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

function buildTree(data, getPath, getKey) {
  const tree = { children: {} }

  data.forEach((item) => {
    const path = getPath(item)
    let node = tree

    while (path.length > 0) {
      const el = path.shift()
      node.children[el] = node.children[el] || {
        children: {},
        parent: node,
        category: true,
      }
      node = node.children[el]
    }

    node.children[getKey(item)] = item
  })
  return tree
}
