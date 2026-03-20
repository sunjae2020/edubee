import { View, Text, Svg, Circle, Ellipse, Path } from "@react-pdf/renderer";
import { StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  wordmark: {
    flexDirection: "column",
  },
  edubee: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1C1917",
    letterSpacing: -0.2,
  },
  camp: {
    fontSize: 8,
    fontWeight: 500,
    color: "#F5821F",
    letterSpacing: 2,
    marginTop: 2,
  },
});

interface EdubeePdfLogoProps {
  showWordmark?: boolean;
}

export function EdubeePdfLogo({ showWordmark = true }: EdubeePdfLogoProps) {
  return (
    <View style={styles.wrapper}>
      {/* Bee SVG icon */}
      <Svg viewBox="0 0 30 30" width={30} height={30}>
        {/* Left wing */}
        <Ellipse
          cx="7" cy="13" rx="5" ry="7"
          fill="#FEF0E3"
          stroke="#F5821F"
          strokeWidth={0.8}
        />
        {/* Right wing */}
        <Ellipse
          cx="23" cy="13" rx="5" ry="7"
          fill="#FEF0E3"
          stroke="#F5821F"
          strokeWidth={0.8}
        />
        {/* Body */}
        <Ellipse cx="15" cy="17" rx="7" ry="9" fill="#F5821F" />
        {/* Stripe 1 */}
        <Path d="M 9,15 Q 15,13 21,15" stroke="#FFFFFF" strokeWidth={1.2} />
        {/* Stripe 2 */}
        <Path d="M 9,18 Q 15,16 21,18" stroke="#FFFFFF" strokeWidth={1.2} />
        {/* Left antenna */}
        <Path d="M 12,8 Q 10,4 9,2" stroke="#D96A0A" strokeWidth={1} />
        <Circle cx={9} cy={2} r={1} fill="#D96A0A" />
        {/* Right antenna */}
        <Path d="M 18,8 Q 20,4 21,2" stroke="#D96A0A" strokeWidth={1} />
        <Circle cx={21} cy={2} r={1} fill="#D96A0A" />
      </Svg>

      {showWordmark && (
        <View style={styles.wordmark}>
          <Text style={styles.edubee}>edubee</Text>
          <Text style={styles.camp}>CAMP</Text>
        </View>
      )}
    </View>
  );
}
