import SwiftUI

// SaglitzSearch — the field, the clear button, and cancel are all system.
// `.searchable` places the field, animates it with the keyboard, and offers
// a Cancel on focus. Prompt is the accessible name, not a placeholder-as-label.

struct SaglitzSearchList: View {
    let items: [String]
    @State private var query = ""

    var filtered: [String] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        if q.isEmpty { return items }
        return items.filter { $0.localizedCaseInsensitiveContains(q) }
    }

    var body: some View {
        NavigationStack {
            List(filtered, id: \.self) { item in
                Text(item).frame(minHeight: 44, alignment: .leading)
            }
            .overlay {
                if filtered.isEmpty {
                    ContentUnavailableView.search(text: query)
                }
            }
            .navigationTitle("Invoices")
            .searchable(text: $query, prompt: "Search invoices")
        }
    }
}

#Preview {
    SaglitzSearchList(items: ["INV-1042", "INV-1043", "Retainer"])
}
