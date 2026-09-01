import SwiftUI

// SaglitzPicker — labelled Picker, error as supporting text (not colour alone).
// Wheel/menu/navigationLink are platform choices; menu is the default on iOS.

struct SaglitzPicker: View {
    let label: String
    @Binding var selection: String
    let options: [(id: String, title: String)]
    var errorMessage: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Picker(label, selection: $selection) {
                ForEach(options, id: \.id) { option in
                    Text(option.title).tag(option.id)
                }
            }
            .pickerStyle(.menu)
            .frame(minHeight: 44)
            .accessibilityLabel(label)
            .accessibilityValue(options.first(where: { $0.id == selection })?.title ?? "")

            if let errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundStyle(.red)
                    .accessibilityAddTraits(.isStaticText)
            }
        }
    }
}

#Preview {
    SaglitzPicker(
        label: "Plan",
        selection: .constant("pro"),
        options: [("free", "Free"), ("pro", "Pro"), ("team", "Team")]
    )
    .padding()
}
