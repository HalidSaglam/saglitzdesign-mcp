import SwiftUI

// SaglitzInvoiceList — a phone table is a List, not a spreadsheet.
// Selection is a checkmark (shape) plus accessibilityAddTraits, not a tint.

struct Invoice: Identifiable, Hashable {
    let id: String
    let name: String
    let status: String
    let amount: String
}

struct SaglitzInvoiceList: View {
    let invoices: [Invoice]
    @Binding var selectedId: String?

    var body: some View {
        List(invoices, selection: $selectedId) { invoice in
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(invoice.name).font(.body)
                    Text(invoice.status).font(.footnote).foregroundStyle(.secondary)
                }
                Spacer()
                Text(invoice.amount)
                    .font(.body.monospacedDigit())
                    .frame(minHeight: 44, alignment: .trailing)
                if selectedId == invoice.id {
                    Image(systemName: "checkmark")
                        .foregroundStyle(.tint)
                        .accessibilityHidden(true)
                }
            }
            .accessibilityAddTraits(selectedId == invoice.id ? [.isSelected] : [])
            .accessibilityLabel("\(invoice.name), \(invoice.status), \(invoice.amount)")
        }
        .overlay {
            if invoices.isEmpty {
                ContentUnavailableView("No invoices yet", systemImage: "doc")
            }
        }
    }
}

#Preview {
    NavigationStack {
        SaglitzInvoiceList(
            invoices: [
                .init(id: "1", name: "INV-1042", status: "Due", amount: "$240.00"),
                .init(id: "2", name: "INV-1043", status: "Paid", amount: "$80.00"),
            ],
            selectedId: .constant("1")
        )
        .navigationTitle("Invoices")
    }
}
