import SwiftUI

// SaglitzPager — finite short lists only. Long lists should use a cursor / Load more.

struct SaglitzPager: View {
    let page: Int
    let pages: Int
    let onChange: (Int) -> Void

    var body: some View {
        HStack(spacing: 8) {
            Button("Previous") { onChange(page - 1) }
                .disabled(page <= 1)
                .frame(minHeight: 44)
            ForEach(visiblePages, id: \.self) { n in
                Button(String(n)) { onChange(n) }
                    .buttonStyle(.borderedProminent)
                    .tint(n == page ? .accentColor : Color(.tertiarySystemFill))
                    .foregroundStyle(n == page ? Color.white : Color.primary)
                    .frame(minWidth: 44, minHeight: 44)
                    .accessibilityAddTraits(n == page ? [.isSelected] : [])
                    .accessibilityLabel("Page \(n)")
            }
            Button("Next") { onChange(page + 1) }
                .disabled(page >= pages)
                .frame(minHeight: 44)
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Pagination, page \(page) of \(pages)")
    }

    private var visiblePages: [Int] {
        [1, min(2, pages), min(3, pages), pages]
            .filter { $0 >= 1 && $0 <= pages }
            .reduce(into: [Int]()) { if !$0.contains($1) { $0.append($1) } }
    }
}

#Preview {
    SaglitzPager(page: 1, pages: 12, onChange: { _ in })
        .padding()
}
