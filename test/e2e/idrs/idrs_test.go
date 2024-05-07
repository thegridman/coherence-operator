/*
 * Copyright (c) 2020, 2024, Oracle and/or its affiliates.
 * Licensed under the Universal Permissive License v 1.0 as shown at
 * http://oss.oracle.com/licenses/upl.
 */

package idrs

import (
	"context"
	"encoding/json"
	"fmt"
	. "github.com/onsi/gomega"
	"github.com/oracle/coherence-operator/test/e2e/helper"
	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/util/wait"
	"os/exec"
	"testing"
	"time"
)

func TestTopics(t *testing.T) {
	// Make sure we defer clean-up when we're done!!
	testContext.CleanupAfterTest(t)
	namespace := helper.GetTestNamespace()

	g := NewGomegaWithT(t)

	t.Log("Deploying initial version of Coherence cluster")

	// Do the initial deployments
	helper.AssertDeployments(testContext, t, "idrs.yaml")

	counts, err := GetCounts()
	g.Expect(err).NotTo(HaveOccurred())

	err = WaitForCounts(testContext, counts, time.Second*2, time.Minute*5)
	g.Expect(err).NotTo(HaveOccurred())

	for i := 0; i < 10; i++ {
		for p := 0; p < 3; p++ {
			for j := 0; j < 2; j++ {
				var pod string
				var sts string
				if j == 0 {
					sts = "storage"
					pod = fmt.Sprintf("storage-%d", p)
				} else {
					sts = "subscriber"
					pod = fmt.Sprintf("subscriber-%d", p)
				}

				t.Logf("Killing Pod %s", pod)
				_, err := kubectl("delete", "pod", pod)
				g.Expect(err).NotTo(HaveOccurred())
				t.Log("Sleeping...")
				time.Sleep(30 * time.Second)
				t.Logf("Waiting for StatefulSet %s to be ready...", sts)
				_, err = helper.WaitForStatefulSet(testContext, namespace, sts, 3, 10*time.Second, 5*time.Minute)
				g.Expect(err).NotTo(HaveOccurred())

				t.Log("Waiting for counts to increase...")
				counts, err = GetCounts()
				g.Expect(err).NotTo(HaveOccurred())
				err = WaitForCounts(testContext, counts, time.Second*2, time.Minute*5)
				g.Expect(err).NotTo(HaveOccurred())
			}
		}
	}
}

func GetCounts() (map[float64]float64, error) {

	m, err := cohctl("get", "subscribers", "test")
	if err != nil {
		return nil, err
	}

	var items []interface{}
	data, ok := m["items"]
	if !ok {
		return nil, errors.Errorf("failed to get items from json")
	}

	items = data.([]interface{})
	if len(items) != 3 {
		return nil, errors.Errorf("failed to get three items from json")
	}

	counts := make(map[float64]float64, 3)

	for _, item := range items {
		sub := item.(map[string]interface{})
		id := sub["id"].(float64)
		count := sub["receivedCount"].(float64)
		counts[id] = count
	}

	return counts, nil
}

func cohctl(args ...string) (map[string]interface{}, error) {
	args = append([]string{"exec", "tracker-0", "-c", "coherence", "--", "/coherence-operator/utils/cohctl"}, args...)
	args = append(args, "-o", "json")

	b, err := kubectl(args...)
	if err != nil {
		return nil, err
	}
	m := make(map[string]interface{})
	if err = json.Unmarshal(b, &m); err != nil {
		return nil, err
	}
	return m, nil
}

func kubectl(args ...string) ([]byte, error) {
	namespace := helper.GetTestNamespace()

	args = append([]string{"-n", namespace}, args...)

	cmd := exec.Command("kubectl", args...)
	return cmd.CombinedOutput()
}

func WaitForCounts(ctx helper.TestContext, initial map[float64]float64, retryInterval, timeout time.Duration) error {
	err := wait.PollUntilContextTimeout(ctx.Context, retryInterval, timeout, true, func(context.Context) (done bool, err error) {
		counts, err := GetCounts()
		if err != nil {
			ctx.Logf("Error waiting for counts to increase - %s", err.Error())
			return false, err
		}

		for id, count := range initial {
			c, ok := counts[id]
			if !ok || count == c {
				ctx.Logf("Waiting for counts to increase - %f is still %f", id, count)
				return false, nil
			}
			ctx.Logf("Waiting for counts to increase - %f was %f is now %f", id, count, c)
		}
		return true, nil
	})

	return err
}
