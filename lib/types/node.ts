export type Node = {
    id: string,
    content: string,
    summary: string,
    parent: Node,
    nextSibling: Node,
    prevSibling: Node
}
