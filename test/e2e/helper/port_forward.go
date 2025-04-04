/*
 * Copyright (c) 2020, 2025, Oracle and/or its affiliates.
 * Licensed under the Universal Permissive License v 1.0 as shown at
 * http://oss.oracle.com/licenses/upl.
 */

package helper

import (
	"bytes"
	"errors"
	"fmt"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/portforward"
	"k8s.io/client-go/transport/spdy"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
)

// PortForwarder forwards ports from the local machine to a K8s Pod.
// This works in the same way the kubectl port-forward works.
//
// Typical usage would be to create the PortForwarder, start it, check
// for error and defer the close. For example
//
//	f := helper.PortForwarder{Namespace:"my-test-ns", PodName:"my-pod", Ports:[]string{"30000:30000"}}
//	err := f.Start()
//	if err != nil {
//	    ... handle error ...
//	}
//	defer f.Close()
//
//	... now the ports are being forwarded ...
type PortForwarder struct {
	// The optional Pod namespace. If not set the default namespace is used.
	Namespace string
	// The name of the Pod to forward ports to.
	PodName string
	// The ports to forward. Each string in the slice is the same format that
	// ports are specified in the kubectl port-forward command.
	Ports []string
	// A flag indicating whether this PortForwarder is running
	Running bool
	// HostName is the host name to use to connect to the Pod
	Hostname string

	stopChan   chan struct{}
	forwarder  *portforward.PortForwarder
	lock       sync.Mutex
	KubeClient kubernetes.Interface
}

// PortForwarderForPod forwards all ports in a Pod to local ports.
// This method returns a PortForwarder that is not started, a map of port name to local port
// and any error that may have occurred.
func PortForwarderForPod(pod *corev1.Pod) (*PortForwarder, map[string]int32, error) {
	localPorts := make(map[string]int32)
	podPorts := make(map[string]int32)
	available := GetAvailablePorts()

	var hostname string
	inK8s := IsTestRunningInK8s()
	if inK8s {
		hostname = pod.Status.PodIP
	} else {
		hostname = "127.0.0.1"
	}

	for _, c := range pod.Spec.Containers {
		for _, p := range c.Ports {
			name := p.Name
			port := p.ContainerPort
			if port != 7 {
				if name == "" {
					name = strconv.Itoa(int(p.ContainerPort))
				}
				podPorts[name] = port
				if inK8s {
					localPorts[name] = port
				} else {
					local, err := available.Next()
					if err != nil {
						return nil, nil, err
					}
					localPorts[name] = local
				}
			}
		}
	}

	ports := make([]string, len(localPorts))
	i := 0
	for name, localPort := range localPorts {
		podPort := podPorts[name]
		ports[i] = fmt.Sprintf("%d:%d", localPort, podPort)
		i++
	}

	return &PortForwarder{Namespace: pod.Namespace, PodName: pod.Name, Hostname: hostname, Ports: ports}, localPorts, nil
}

// StartPortForwarderForPodWithBackoff forwards all ports in a Pod to local ports.
// This method returns a running PortForwarder, a map of port name to local port
// and any error that may have occurred.
func StartPortForwarderForPodWithBackoff(pod *corev1.Pod) (*PortForwarder, map[string]int32, error) {
	var pf *PortForwarder
	var m map[string]int32
	var err error

	for i := 0; i < 10; i++ {
		pf, m, err = StartPortForwarderForPod(pod)
		if err == nil {
			break
		}
	}
	return pf, m, err
}

// StartPortForwarderForPod forwards all ports in a Pod to local ports.
// This method returns a running PortForwarder, a map of port name to local port
// and any error that may have occurred.
func StartPortForwarderForPod(pod *corev1.Pod) (*PortForwarder, map[string]int32, error) {
	pf, m, err := PortForwarderForPod(pod)
	if err != nil {
		return pf, m, err
	}

	if !IsTestRunningInK8s() {
		err = pf.Start()
	}
	return pf, m, err
}

// Start the PortForwarder.
func (f *PortForwarder) Start() error {
	var pfError error

	f.lock.Lock()
	defer f.lock.Unlock()

	if f.Running {
		return errors.New("PortForwarder is already running")
	}

	if f.PodName == "" {
		return errors.New("PortForwarder has a blank PodName field")
	}

	config, defaultNS, err := GetKubeconfigAndNamespace("")
	if err != nil {
		return err
	}

	roundTripper, upgrader, err := spdy.RoundTripperFor(config)
	if err != nil {
		return err
	}

	ns := f.Namespace
	if ns == "" {
		ns = defaultNS
	}
	if ns == "" {
		ns = "default"
	}

	path := fmt.Sprintf("/api/v1/namespaces/%s/pods/%s/portforward", ns, f.PodName)
	hostIP := strings.TrimPrefix(config.Host, "https://")

	serverURL := url.URL{Scheme: "https", Path: path, Host: hostIP}

	dialer := spdy.NewDialer(upgrader, &http.Client{Transport: roundTripper}, http.MethodPost, &serverURL)

	f.stopChan = make(chan struct{}, 1)
	readyChan := make(chan struct{}, 1)

	out, errOut := new(bytes.Buffer), new(bytes.Buffer)

	f.forwarder, err = portforward.New(dialer, f.Ports, f.stopChan, readyChan, out, errOut)
	if err != nil {
		return err
	}

	go func() {
		for range readyChan { // Kubernetes will close this channel when it has something to tell us.
		}
		if len(errOut.String()) != 0 {
			fmt.Println(errOut.String())
		}
	}()

	go func() {
		if err = f.forwarder.ForwardPorts(); err != nil { // Locks until stopChan is closed.
			pfError = err
			fmt.Println(err)
		}
	}()

	// blocks until forwarder is ready
	<-f.forwarder.Ready

	f.Running = true

	return pfError
}

// Close the PortForwarder.
func (f *PortForwarder) Close() {
	f.lock.Lock()
	defer f.lock.Unlock()

	if f.stopChan != nil {
		close(f.stopChan)
	}

	f.Running = false
}

// AvailablePorts finds free ports on the current machine.
type AvailablePorts interface {
	Next() (int32, error)
	NextPortForward(ports ...int32) ([]string, error)
}

// GetAvailablePorts obtains an AvailablePorts that finds free ephemeral ports.
func GetAvailablePorts() AvailablePorts {
	return &ports{}
}

// ports is an internal AvailablePorts implementation.
type ports struct {
}

func (p *ports) Next() (int32, error) {
	if p == nil {
		return -1, errors.New("next called on a nil AvailablePorts")
	}

	addr, err := net.ResolveTCPAddr("tcp", "localhost:0")
	if err != nil {
		return 0, err
	}

	l, err := net.ListenTCP("tcp", addr)
	if err != nil {
		return 0, err
	}

	_ = l.Close()

	port := l.Addr().(*net.TCPAddr).Port

	return int32(port), nil
}

func (p *ports) NextPortForward(ports ...int32) ([]string, error) {
	s := make([]string, len(ports))

	for i, local := range ports {
		remote, err := p.Next()
		if err != nil {
			return nil, err
		}
		s[i] = fmt.Sprintf("%d:%d", local, remote)
	}

	return s, nil
}
