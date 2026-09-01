import SwiftUI

// Compact nested-settings path. iPhone uses the back button + title instead.

struct SaglitzCrumb: Identifiable {
    let id: String
    let label: String
}

struct SaglitzBreadcrumb: View {
    let items: [SaglitzCrumb]
    var onSelect: (String) -> Void

    var body: some View {
        HStack(spacing: 8) {
            ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                if index > 0 {
                    Text("/")
                        .foregroundStyle(.secondary)
                        .accessibilityHidden(true)
                }
                let last = index == items.count - 1
                if last {
                    Text(item.label)
                        .fontWeight(.semibold)
                        .accessibilityAddTraits(.isSelected)
                } else {
                    Button(item.label) { onSelect(item.id) }
                        .buttonStyle(.plain)
                        .foregroundStyle(.tint)
                        .frame(minHeight: 44)
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Breadcrumb")
    }
}

#Preview {
    SaglitzBreadcrumb(
        items: [
            SaglitzCrumb(id: "home", label: "Home"),
            SaglitzCrumb(id: "billing", label: "Billing"),
            SaglitzCrumb(id: "invoices", label: "Invoices"),
        ],
        onSelect: { _ in }
    )
    .padding()
}
