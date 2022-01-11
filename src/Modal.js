import { Fragment, useState } from 'react'
import { createPortal } from 'react-dom'
import './Modal.css'

export function useModal(Component, props = {}) {
  const [show, setShow] = useState(false)
  const [finalProps, setProps] = useState(props)

  return [
    show
      ? createPortal(
          <Fragment>
            <div className="ModalOverlay" onClick={() => setShow(false)}>
              <div className="ModalContainer" onClick={(e) => e.stopPropagation()}>
                <Component {...finalProps} onHide={() => setShow(false)} />
              </div>
            </div>
          </Fragment>,
          document.body
        )
      : null,
    (props) => {
      setShow(true)
      setProps({ ...finalProps, ...(props || {}) })
    },
  ]
}
