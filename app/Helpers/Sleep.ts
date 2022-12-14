export default function sleep (ms: number) {
    if (ms <= 0) {
        return Promise.resolve(false)
    }
    return new Promise((resolve) => setTimeout(resolve, ms))
}
