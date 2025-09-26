/*
 * Copyright (c) 2020, 2025, Oracle and/or its affiliates.
 * Licensed under the Universal Permissive License v 1.0 as shown at
 * http://oss.oracle.com/licenses/upl.
 */

package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
)

// checks all the http links in a document

const (
	ArgFile    = "file"
	ArgExclude = "exclude"
)

func main() {

	if _, err := Execute(); err != nil {
		logf.Log.WithName("runner").Error(err, "Unexpected error while executing command")
		os.Exit(1)
	}
}

// Execution is a holder of details of a command execution
type Execution struct {
	Cmd *cobra.Command
	App string
	V   *viper.Viper
}

// contextKey allows type safe Context Values.
type contextKey int

// The key to obtain an execution from a Context.
var executionKey contextKey

// Execute runs the runner with a given environment.
func Execute() (Execution, error) {
	return ExecuteWithArgs(nil)
}

// ExecuteWithArgs runs the runner with a given environment and argument overrides.
func ExecuteWithArgs(args []string) (Execution, error) {
	cmd, v := NewRootCommand()
	if len(args) > 0 {
		cmd.SetArgs(args)
	}

	e := Execution{
		Cmd: cmd,
		V:   v,
	}

	ctx := context.WithValue(context.Background(), executionKey, &e)
	err := cmd.ExecuteContext(ctx)
	return e, err
}

// NewRootCommand builds the root cobra command that handles our command line tool.
func NewRootCommand() (*cobra.Command, *viper.Viper) {
	v := viper.New()

	// rootCommand is the Cobra root Command to execute
	rootCmd := &cobra.Command{
		Use:   "runner",
		Short: "Run the link checker",
		Long:  "Run the link checker",
		RunE: func(cmd *cobra.Command, args []string) error {
			return run(cmd)
		},
	}

	rootCmd.SetHelpFunc(func(cmd *cobra.Command, args []string) {
		_ = cmd.Help()
	})

	flags := rootCmd.Flags()
	flags.StringArray(ArgFile, nil, "a file or directory to scan")
	flags.StringArray(ArgExclude, nil, "a link prefix to exclude")
	return rootCmd, v
}

func run(cmd *cobra.Command) error {
	flagSet := cmd.Flags()
	files, err := flagSet.GetStringArray(ArgFile)
	if err != nil {
		return err
	}
	excludes, err := flagSet.GetStringArray(ArgExclude)
	if err != nil {
		return err
	}

	excludes = append(excludes, "https://localhost")
	excludes = append(excludes, "http://localhost")
	excludes = append(excludes, "http://127.0.0.1")
	excludes = append(excludes, "https://127.0.0.1")
	excludes = append(excludes, "https://host")
	excludes = append(excludes, "http://host")
	excludes = append(excludes, "https://cert-manager.io")

	exitCode, failedLinks, err := checkDocs(files, excludes)
	if err != nil {
		return err
	}
	if exitCode != 0 {
		fmt.Println("Link checking FAILED")
		for link, pages := range failedLinks {
			fmt.Println(link)
			for _, page := range pages {
				fmt.Println("    Page: " + page)
			}
		}
		return fmt.Errorf("link checking failed")
	}
	fmt.Println("Link checking PASSED")
	return nil
}

func checkDocs(paths []string, excludes []string) (int, map[string][]string, error) {
	var err error
	exitCode := 0

	failedLinks := make(map[string][]string)

	for _, path := range paths {
		var mapFragments map[string]map[string][]string

		if strings.HasSuffix(path, "/...") {
			mapFragments, err = gatherLinksFromDirectory(path[0:len(path)-4], excludes)
		} else {
			mapFragments, err = gatherLinksFromDoc(path, excludes)
		}

		if err != nil {
			return 1, failedLinks, err
		}

		for link, fragments := range mapFragments {
			if rc := checkLink(link, fragments, excludes); rc != 0 {
				exitCode = rc
				for _, fragment := range fragments {
					failedLinks[link] = append(failedLinks[link], fragment...)
				}
			}
		}
	}

	return exitCode, failedLinks, err
}

func gatherLinksFromDirectory(dirName string, excludes []string) (map[string]map[string][]string, error) {
	fmt.Printf("Checking directory %s\n", dirName)
	info, err := os.Stat(dirName)
	if err != nil {
		return nil, err
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("%s is not a directory", dirName)
	}
	return gatherLinksFromFileInfo(dirName, info, excludes)
}

func gatherLinksFromFileInfo(dir string, info os.FileInfo, excludes []string) (map[string]map[string][]string, error) {
	mapFragments := make(map[string]map[string][]string)

	if info.IsDir() {
		files, err := os.ReadDir(dir)
		if err != nil {
			return mapFragments, err
		}

		for _, f := range files {
			var fragments map[string]map[string][]string

			name := f.Name()
			if !strings.HasPrefix(name, ".") {
				fullName := fmt.Sprintf("%s%s%s", dir, string(os.PathSeparator), name)
				if f.IsDir() {
					fragments, err = gatherLinksFromDirectory(fullName, excludes)
					if err != nil {
						return mapFragments, err
					}
					appendMaps(fragments, mapFragments)
				} else {
					fragments, err = gatherLinksFromDoc(fullName, excludes)
					if err != nil {
						return mapFragments, err
					}
					appendMaps(fragments, mapFragments)
				}
			}
		}

		return mapFragments, err
	} else {
		return gatherLinksFromDoc(info.Name(), excludes)
	}
}

func gatherLinksFromDoc(path string, excludes []string) (map[string]map[string][]string, error) {
	var mapFragments map[string]map[string][]string
	var err error

	if !strings.HasSuffix(path, ".js") && !strings.HasSuffix(path, ".html") {
		return mapFragments, nil
	}

	buf, err := os.ReadFile(path)
	if err != nil {
		return mapFragments, err
	}
	s := string(buf)
	mapFragments, err = parseLinks(s, excludes)
	if err != nil {
		return mapFragments, err
	}
	for _, fragments := range mapFragments {
		for i, fragment := range fragments {
			fragment = append(fragment, path)
			fragments[i] = fragment
		}
	}
	return mapFragments, nil
}

func appendMaps(source, dest map[string]map[string][]string) {
	for srcLink, srcFragments := range source {
		destFragments := dest[srcLink]
		dest[srcLink] = appendMapOfStringArray(srcFragments, destFragments)
	}
}

func appendMapOfStringArray(source, dest map[string][]string) map[string][]string {
	if dest == nil {
		dest = make(map[string][]string)
	}
	for k, v := range source {
		a, found := dest[k]
		if !found {
			a = []string{}
		}
		a = append(a, v...)
		dest[k] = a
	}
	return dest
}

func checkLink(link string, fragments map[string][]string, excludes []string) int {
	var (
		err      error
		urlToGet *url.URL
	)

	for _, skip := range excludes {
		if strings.HasPrefix(link, skip) {
			return 0
		}
	}

	exitCode := 0

	if strings.Contains(link, "(") {
		fmt.Printf("%s FAILED - not a valid link\n", link)
		return 1
	}

	// Parse URL
	if urlToGet, err = url.Parse(link); err != nil {
		fmt.Println(err)
		return 1
	}

	// Retrieve content of URL
	if check := checkURL(urlToGet, fragments); check != 0 {
		exitCode = 1
	}

	return exitCode
}

func checkURL(urlToGet *url.URL, fragments map[string][]string) int {
	var (
		err     error
		resp    *http.Response
		content []byte
	)

	fmt.Printf("%s", urlToGet)

	var netClient = &http.Client{
		Timeout: time.Minute * 1,
	}

	urlStr := urlToGet.String()

	// Create a new request using http
	req, err := http.NewRequest("GET", urlStr, nil)
	if err != nil {
		fmt.Printf(" FAILED error: %v\n", err)
		return 1
	}

	if strings.HasPrefix(urlStr, "https://github.com") {
		if token, found := os.LookupEnv("GH_TOKEN"); found && token != "" {
			// Create a Bearer string by appending string access token
			var bearer = "Bearer " + token
			// add authorization header to the req
			req.Header.Add("Authorization", bearer)
			fmt.Print(" (URL is GitHub, GH_TOKEN is set)")
		} else {
			fmt.Print(" (URL is GitHub, but no auth token in GH_TOKEN)")
		}
	}

	if resp, err = netClient.Do(req); err != nil {
		if isTimeout(err) {
			fmt.Println(" request timed out, backing off for one minute")
			time.Sleep(1 * time.Minute)

			if resp, err = netClient.Do(req); err != nil {
				fmt.Printf(" FAILED error: %v\n", err)
				return 1
			}
		} else {
			fmt.Printf(" FAILED error: %v\n", err)
			return 1
		}
	}

	retryCount := 10
	if retryCountStr, found := os.LookupEnv("LINK_CHECK_RETRY_COUNT"); found {
		if c, err := strconv.Atoi(retryCountStr); err == nil {
			retryCount = c
		}
	}

	if resp.StatusCode == 429 {
		for i := 0; i < retryCount; i++ {
			_ = resp.Body.Close()
			fmt.Println(" received 429 status waiting for one minute")
			time.Sleep(1 * time.Minute)

			if resp, err = netClient.Do(req); err != nil {
				fmt.Printf(" FAILED error: %v\n", err)
				return 1
			}

			if resp.StatusCode != 429 {
				break
			}
		}
	}

	//goland:noinspection GoUnhandledErrorResult
	defer resp.Body.Close()

	// Check if the request was successful
	if resp.StatusCode != 200 {
		body := ""
		if content, err = io.ReadAll(resp.Body); err == nil {
			body = string(content)
		}
		fmt.Printf(" FAILED response: %d\n%v\n%s\n", resp.StatusCode, body, resp.Header)
		return 1
	}

	// Read the body of the HTTP response
	if content, err = io.ReadAll(resp.Body); err != nil {
		fmt.Printf(" FAILED error: %v\n", err)
		return 1
	}

	fmt.Println(" OK")

	pageContent := string(content)

	for fragment, _ := range fragments {
		if fragment != "" {
			fmt.Printf("%s#%s", urlToGet, fragment)
			if !checkFragment(fragment, pageContent) {
				return 1
			}
			fmt.Println(" OK")
		}
	}

	return 0
}

func isTimeout(err error) bool {
	return strings.Contains(err.Error(), "i/o timeout")
}

func checkFragment(fragment, pageContent string) bool {
	var headings []string

	headings = append(headings, fmt.Sprintf("id=\"%s\"", fragment))
	headings = append(headings, fmt.Sprintf("id=%s", fragment))
	headings = append(headings, fmt.Sprintf("href=\"#%s\"", fragment))
	headings = append(headings, fmt.Sprintf("href=\\\"#%s\\\"", fragment))

	for _, heading := range headings {
		if strings.Contains(pageContent, heading) {
			return true
		}
	}

	fmt.Println(" FAILED could not find any of the following headings:")
	for _, heading := range headings {
		fmt.Printf("   %s", heading)
	}
	return false
}

func parseLinks(content string, excludes []string) (map[string]map[string][]string, error) {
	var (
		err       error
		matches   [][]string
		links     []string
		findLinks = regexp.MustCompile("<a.*?href=\"(.*?)\"")
	)

	// Retrieve all anchor tag URLs from string
	matches = findLinks.FindAllStringSubmatch(content, -1)

	linkMap := make(map[string]map[string][]string)

	for _, val := range matches {
		var linkUrl *url.URL

		// Parse the anchor tag URL
		u := val[1]
		skip := false
		for _, exclude := range excludes {
			if strings.HasPrefix(u, exclude) {
				skip = true
				break
			}
		}

		if skip {
			break
		}

		if linkUrl, err = url.Parse(u); err != nil {
			return linkMap, err
		}

		if linkUrl.IsAbs() {
			s := linkUrl.String()
			if linkUrl.Fragment != "" {
				s = s[0:(len(s) - 1 - len(linkUrl.Fragment))]
			}
			f, found := linkMap[s]
			if !found {
				f = make(map[string][]string)
			}
			f[linkUrl.Fragment] = make([]string, 0)
			linkMap[s] = f
		}

		links = make([]string, 0)
		for link, _ := range linkMap {
			links = append(links, link)
		}
	}

	sort.Strings(links)
	return linkMap, err
}
