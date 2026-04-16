/** Charge un script unique (id) dans <head>. */
export function loadExternalScript(src: string, id: string): Promise<void> {
  if (document.getElementById(id)) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.id = id
    s.async = true
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Script failed: ${src}`))
    document.head.appendChild(s)
  })
}
