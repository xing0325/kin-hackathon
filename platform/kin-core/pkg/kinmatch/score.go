package kinmatch

import (
	"fmt"
	"sort"
	"strings"
)

type Profile struct {
	Skills    []string
	Needs     []string
	Interests []string
}

type Result struct {
	Score   float64
	Reasons []string
}

func terms(values []string) map[string]struct{} {
	result := make(map[string]struct{}, len(values))
	for _, value := range values {
		value = strings.ToLower(strings.TrimSpace(value))
		if value != "" {
			result[value] = struct{}{}
		}
	}
	return result
}

func intersection(left, right map[string]struct{}) []string {
	result := []string{}
	for value := range left {
		if _, ok := right[value]; ok {
			result = append(result, value)
		}
	}
	sort.Strings(result)
	return result
}

// ScoreProfiles preserves the deterministic KIN prototype scoring behavior.
// semantic must be normalized to [0,1].
func ScoreProfiles(left, right Profile, semantic float64) Result {
	if semantic < 0 {
		semantic = 0
	}
	if semantic > 1 {
		semantic = 1
	}
	ls, ln := terms(left.Skills), terms(left.Needs)
	rs, rn := terms(right.Skills), terms(right.Needs)
	leftHelp := intersection(ln, rs)
	rightHelp := intersection(rn, ls)
	common := intersection(terms(left.Interests), terms(right.Interests))
	union := map[string]struct{}{}
	for _, set := range []map[string]struct{}{ls, ln, rs, rn} {
		for value := range set {
			union[value] = struct{}{}
		}
	}
	denominator := len(union)
	if denominator == 0 {
		denominator = 1
	}
	complementary := float64(len(leftHelp)+len(rightHelp)) / float64(denominator)
	interest := float64(len(common)) / 3
	if interest > 1 {
		interest = 1
	}
	score := .45*semantic + .35*complementary + .20*interest
	if score < .05 {
		score = .05
	}
	if score > 1 {
		score = 1
	}
	reasons := []string{}
	for _, value := range leftHelp {
		reasons = append(reasons, fmt.Sprintf("对方擅长你正在需要的：%s", value))
	}
	for _, value := range rightHelp {
		reasons = append(reasons, fmt.Sprintf("你擅长对方正在需要的：%s", value))
	}
	if len(common) > 0 {
		reasons = append(reasons, "共同关注："+strings.Join(common, "、"))
	}
	if len(reasons) == 0 {
		reasons = append(reasons, "双方当前项目和经验存在语义关联")
	}
	if len(reasons) > 3 {
		reasons = reasons[:3]
	}
	return Result{Score: score, Reasons: reasons}
}
