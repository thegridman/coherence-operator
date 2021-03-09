<doc-view>

<h2 id="_coherence_operator_deployment_example">Coherence Operator Deployment Example</h2>
<div class="section">
<p>This example showcases how to deploy Coherence applications using the Coherence Operator.</p>

<p>This example shows how to use the Kubernetes Horizontal Pod Autoscaler to scale Coherence clusters.
You can find the source code in the <a id="" title="" target="_blank" href="https://github.com/oracle/coherence-operator/tree/master/examples/deployment">Operator GitHub Repo</a></p>

<p>The following scenarios are covered:</p>

<ol style="margin-left: 15px;">
<li>
Installing the Coherence Operator

</li>
<li>
Installing a Coherence cluster

</li>
<li>
Deploying a Proxy tier

</li>
<li>
Deploying a storage-disabled application

</li>
<li>
Enabling Active Persistence

</li>
<li>
Viewing Metrics via Grafana

</li>
</ol>
<p>After the initial installation of the Coherence cluster, the following examples
build on the previous ones by issuing a <code>kubectl apply</code> to modify
the installation adding additional roles.</p>

<p>You can use <code>kubectl create</code> for any of the examples to install that one directly.</p>

<ul class="ulist">
<li>
<p><router-link to="#pre" @click.native="this.scrollFix('#pre')">Prerequisites</router-link></p>
<ul class="ulist">
<li>
<p><router-link to="#create-the-example-namespace" @click.native="this.scrollFix('#create-the-example-namespace')">Create the example namespace</router-link></p>

</li>
<li>
<p><router-link to="#clone-the-github-repository" @click.native="this.scrollFix('#clone-the-github-repository')">Clone the GitHub repository</router-link></p>

</li>
<li>
<p><router-link to="#install-operator" @click.native="this.scrollFix('#install-operator')">Install the Coherence Operator</router-link></p>

</li>
</ul>
</li>
<li>
<p><router-link to="#examples" @click.native="this.scrollFix('#examples')">Run the Examples</router-link></p>
<ul class="ulist">
<li>
<p><router-link to="#ex1" @click.native="this.scrollFix('#ex1')">Example 1 - Coherence cluster only</router-link></p>

</li>
<li>
<p><router-link to="#ex2" @click.native="this.scrollFix('#ex2')">Example 2 - Adding a Proxy role</router-link></p>

</li>
<li>
<p><router-link to="#ex3" @click.native="this.scrollFix('#ex3')">Example 3 - Adding a User application role</router-link></p>

</li>
<li>
<p><router-link to="#ex4" @click.native="this.scrollFix('#ex4')">Example 4 - Enabling Persistence</router-link></p>

</li>
<li>
<p><router-link to="#metrics" @click.native="this.scrollFix('#metrics')">View Cluster Metrics via Grafana</router-link></p>

</li>
<li>
<p>[Port Forward and Access Grafana](#port-forward-and-access-grafana)</p>

</li>
</ul>
</li>
<li>
<p>[Cleaning Up](#cleaning-up)</p>

</li>
</ul>
</div>

<h2 id="pre">Prerequisites</h2>
<div class="section">
<p>Ensure you have the following software installed:</p>

<ul class="ulist">
<li>
<p>Java 11+ JDK either [OpenJDK](<a id="" title="" target="_blank" href="https://adoptopenjdk.net/">https://adoptopenjdk.net/</a>) or [Oracle JDK](<a id="" title="" target="_blank" href="https://www.oracle.com/java/technologies/javase-downloads.html">https://www.oracle.com/java/technologies/javase-downloads.html</a>)</p>

</li>
<li>
<p>[Docker](<a id="" title="" target="_blank" href="https://docs.docker.com/install/">https://docs.docker.com/install/</a>) version 17.03+.</p>

</li>
<li>
<p>Access to a Kubernetes v1.14.0+ cluster.</p>

</li>
<li>
<p><a id="" title="" target="_blank" href="https://kubernetes.io/docs/tasks/tools/install-kubectl/">kubectl</a> version matching your Kubernetes cluster.</p>

</li>
</ul>
</div>

<h2 id="create-the-example-namespace">Create the example namespace</h2>
<div class="section">
<p>You need to create the namespace for the first time to run any of the examples. Create your target namespace:</p>

<markup
lang="bash"

>kubectl create namespace coherence-example

namespace/coherence-example created</markup>

<div class="admonition note">
<p class="admonition-textlabel">Note</p>
<p ><p>In the examples, a Kubernetes namespace called <code>coherence-example</code> is used.
If you want to change this namespace, ensure that you change any references to this namespace
to match your selected namespace when running the examples.</p>
</p>
</div>
</div>

<h2 id="clone-the-github-repository">Clone the GitHub repository</h2>
<div class="section">
<p>This examples exist in the <code>examples/deployment</code> directory in the
<a id="" title="" target="_blank" href="https://github.com/oracle/coherence-operator">Coherence Operator GitHub repository</a>.</p>

<p>Clone the repository:</p>

<markup
lang="bash"

>git clone https://github.com/oracle/coherence-operator

cd coherence-operator/examples/deployment</markup>

<p>Ensure you have Docker running and JDK 11+ build environment set and use the
following command from the deployment example directory to build the project and associated Docker image:</p>

<markup
lang="bash"

>./mvnw package jib:dockerBuild</markup>

<div class="admonition note">
<p class="admonition-textlabel">Note</p>
<p ><p>If you are running behind a corporate proxy and receive the following message building the Docker image:
<code>Connect to gcr.io:443 [gcr.io/172.217.212.82] failed: connect timed out</code> you must modify the build command
to add the proxy hosts and ports to be used by the <code>jib-maven-plugin</code> as shown below:</p>

<markup
lang="bash"

>mvn package jib:dockerBuild -Dhttps.proxyHost=host \
    -Dhttps.proxyPort=80 -Dhttp.proxyHost=host -Dhttp.proxyPort=80</markup>
</p>
</div>
<p>This will result in the following Docker image being created which contains the configuration and server-side
artifacts to be use by all deployments.</p>

<markup


>deployment-example:1.0.0</markup>

<div class="admonition note">
<p class="admonition-textlabel">Note</p>
<p ><p>If you are running against a remote Kubernetes cluster, you need to tag and
push the Docker image to your repository accessible to that cluster.
You also need to prefix the image name in the <code>yaml</code> files below.</p>
</p>
</div>
</div>

<h2 id="install-operator">Install the Coherence Operator</h2>
<div class="section">
<p>Install the Coherence Operator using your preferred method in the Operator
<a id="" title="" target="_blank" href="https://oracle.github.io/coherence-operator/docs/latest/#/installation/01_installation">Installation Guide</a></p>

<p>Confirm the operator is running, for example:</p>

<markup
lang="bash"

>kubectl get pods -n coherence-example

NAME                                                     READY   STATUS    RESTARTS   AGE
coherence-operator-controller-manager-74d49cd9f9-sgzjr   1/1     Running   1          27s</markup>

</div>

<h2 id="examples">Run the Examples</h2>
<div class="section">
<p>Ensure you are in the <code>examples/deployment</code> directory to run the following commands.</p>


<h3 id="ex1">Example 1 - Coherence cluster only</h3>
<div class="section">
<p>The first example uses the yaml file <code>src/main/yaml/example-cluster.yaml</code>, which
defines a single role <code>storage</code> which will store cluster data.</p>

<div class="admonition note">
<p class="admonition-inline">If you have pushed your Docker image to a remote repository, ensure you update the above file to prefix the image.</p>
</div>

<h4 id="_1_install_the_coherence_cluster_storage_role">1. Install the Coherence cluster <code>storage</code> role</h4>
<div class="section">
<markup
lang="bash"

>kubectl -n coherence-example create -f src/main/yaml/example-cluster.yaml

coherence.coherence.oracle.com/example-cluster-storage created</markup>

</div>

<h4 id="_2_list_the_created_coherence_cluster">2. List the created Coherence cluster</h4>
<div class="section">
<markup
lang="bash"

>kubectl -n coherence-example get coherence

NAME                      CLUSTER           ROLE                      REPLICAS   READY   PHASE
example-cluster-storage   example-cluster   example-cluster-storage   3                  Created

NAME                                                         AGE
coherencerole.coherence.oracle.com/example-cluster-storage   18s</markup>

</div>

<h4 id="_3_view_the_running_pods">3. View the running pods</h4>
<div class="section">
<p>Run the following command to view the Pods:</p>

<markup
lang="bash"

>kubectl -n coherence-example get pods</markup>

<markup
lang="bash"

>NAME                                                     READY   STATUS    RESTARTS   AGE
coherence-operator-controller-manager-74d49cd9f9-sgzjr   1/1     Running   1          6m46s
example-cluster-storage-0                                0/1     Running   0          119s
example-cluster-storage-1                                1/1     Running   0          119s
example-cluster-storage-2                                0/1     Running   0          118s</markup>

</div>

<h4 id="_connect_to_the_coherence_console_inside_the_cluster_to_add_data">Connect to the Coherence Console inside the cluster to add data</h4>
<div class="section">
<p>Since we cannot yet access the cluster via Coherence*Extend, we will connect via Coherence console to add data.</p>

<markup
lang="bash"

>kubectl exec -it -n coherence-example example-cluster-storage-0 /coherence-operator/utils/runner console</markup>

<p>At the prompt type the following to create a cache called <code>test</code>:</p>

<markup
lang="bash"

>cache test</markup>

<p>Use the following to create 10,000 entries of 100 bytes:</p>

<markup
lang="bash"

>bulkput 10000 100 0 100</markup>

<p>Lastly issue the command <code>size</code> to verify the cache entry count.</p>

<p>Type <code>bye</code> to exit the console.</p>

</div>

<h4 id="_scale_the_storage_role_to_6_members">Scale the <code>storage</code> role to 6 members</h4>
<div class="section">
<p>To scale up the cluster the <code>kubectl scale</code> command can be used:</p>

<markup
lang="bash"

>kubectl -n coherence-example scale coherence/example-cluster-storage --replicas=6</markup>

<p>Use the following to verify all 6 nodes are Running and READY before continuing.</p>

<markup
lang="bash"

>kubectl -n coherence-example get pods</markup>

<markup
lang="bash"

>NAME                                                     READY   STATUS    RESTARTS   AGE
coherence-operator-controller-manager-74d49cd9f9-sgzjr   1/1     Running   1          53m
example-cluster-storage-0                                1/1     Running   0          49m
example-cluster-storage-1                                1/1     Running   0          49m
example-cluster-storage-2                                1/1     Running   0          49m
example-cluster-storage-3                                1/1     Running   0          54s
example-cluster-storage-4                                1/1     Running   0          54s
example-cluster-storage-5                                1/1     Running   0          54s</markup>

</div>

<h4 id="_confirm_the_cache_count">Confirm the cache count</h4>
<div class="section">
<p>Re-run step 3 above and just use the <code>cache test</code> and <code>size</code> commands to confirm the number of entries is still 10,000.</p>

<p>This confirms that the scale-out was done in a <code>safe</code> manner ensuring no data loss.</p>

</div>
</div>

<h3 id="_scale_the_storage_role_back_to_3_members">Scale the <code>storage</code> role back to 3 members</h3>
<div class="section">
<p>To scale back doewn to three members run the following command:</p>

<markup
lang="bash"

>kubectl -n coherence-example scale coherence/example-cluster-storage --replicas=3</markup>

<p>By using the following, you will see that the number of members will gradually scale back to
3 during which the is done in a <code>safe</code> manner ensuring no data loss.</p>

<markup
lang="bash"

>kubectl -n coherence-example get pods</markup>

<markup
lang="bash"

>NAME                        READY   STATUS        RESTARTS   AGE
example-cluster-storage-0   1/1     Running       0          19m
example-cluster-storage-1   1/1     Running       0          19m
example-cluster-storage-2   1/1     Running       0          19m
example-cluster-storage-3   1/1     Running       0          3m41s
example-cluster-storage-4   0/1     Terminating   0          3m41s</markup>

</div>

<h3 id="ex2">Example 2 - Adding a Proxy role</h3>
<div class="section">
<p>The second example uses the yaml file <code>src/main/yaml/example-cluster-proxy.yaml</code>, which
adds a proxy server <code>example-cluster-proxy</code> to allow for Coherence*Extend connections via a Proxy server.</p>

<p>The additional yaml added below shows:</p>

<ul class="ulist">
<li>
<p>A port called <code>proxy</code> being exposed on 20000</p>

</li>
<li>
<p>The role being set as storage-disabled</p>

</li>
<li>
<p>A different cache config being used which will start a Proxy Server. See [here](src/main/resources/proxy-cache-config.xml) for details</p>

</li>
</ul>
<markup
lang="yaml"

>apiVersion: coherence.oracle.com/v1
kind: Coherence
metadata:
  name: example-cluster-proxy
spec:
  cluster: example-cluster
  jvm:
    memory:
      heapSize: 512m
  ports:
    - name: metrics
      port: 9612
      serviceMonitor:
        enabled: true
    - name: proxy
      port: 20000
  coherence:
    cacheConfig: proxy-cache-config.xml
    storageEnabled: false
    metrics:
      enabled: true
  image: deployment-example:1.0.0
  imagePullPolicy: Always
  replicas: 1</markup>


<h4 id="_install_the_proxy_role">Install the <code>proxy</code> role</h4>
<div class="section">
<markup
lang="bash"

>  kubectl -n coherence-example apply -f src/main/yaml/example-cluster-proxy.yaml

  kubectl get coherence -n coherence-example

  NAME                      CLUSTER           ROLE                      REPLICAS   READY   PHASE
  example-cluster-proxy     example-cluster   example-cluster-proxy     1          1       Ready
  example-cluster-storage   example-cluster   example-cluster-storage   3          3       Ready</markup>

</div>

<h4 id="_view_the_running_pods">View the running pods</h4>
<div class="section">
<markup
lang="bash"

>kubectl -n coherence-example get pods

NAME                                  READY   STATUS    RESTARTS   AGE
coherence-operator-578497bb5b-w89kt   1/1     Running   0          68m
example-cluster-proxy-0               1/1     Running   0          2m41s
example-cluster-storage-0             1/1     Running   0          29m
example-cluster-storage-1             1/1     Running   0          29m
example-cluster-storage-2             1/1     Running   0          2m43s</markup>

<p>Ensure the <code>example-cluster-proxy-0</code> pod is Running and READY before continuing.</p>

</div>

<h4 id="_port_forward_the_proxy_port">Port forward the proxy port</h4>
<div class="section">
<pre>In a separate terminal, run the following:</pre>
<markup
lang="bash"

>    kubectl port-forward -n coherence-example example-cluster-proxy-0 20000:20000</markup>

</div>

<h4 id="_connect_via_cohql_and_add_data">Connect via CohQL and add data</h4>
<div class="section">
<p>In a separate terminal, change to the <code>examples/deployments</code> directory and run the following to
start Coherence Query Language (CohQL):</p>

<markup
lang="bash"

>    mvn exec:java

    Coherence Command Line Tool

    CohQL&gt;</markup>

<p>Run the following <code>CohQL</code> commands to view and insert data into the cluster.</p>

<markup


>CohQL&gt; select count() from 'test';

Results
10000

CohQL&gt; insert into 'test' key('key-1') value('value-1');

CohQL&gt; select key(), value() from 'test' where key() = 'key-1';
Results
["key-1", "value-1"]

CohQL&gt; select count() from 'test';
Results
10001

CohQL&gt; quit</markup>

<p>The above results will show that you can see the data previously inserted and
can add new data into the cluster using Coherence*Extend.</p>

</div>
</div>

<h3 id="ex3">Example 3 - Adding a User application role</h3>
<div class="section">
<p>The third example uses the yaml file <code>src/main/yaml/example-cluster-app.yaml</code>, which
adds a new role <code>rest</code>. This role defines a user application which uses <a id="" title="" target="_blank" href="https://helidon.io/">Helidon</a> to create a <code>/query</code> endpoint allowing the user to send CohQL commands via this endpoint.</p>

<p>The additional yaml added below shows:</p>

<ul class="ulist">
<li>
<p>A port called <code>http</code> being exposed on 8080 for the application</p>

</li>
<li>
<p>The role being set as storage-disabled</p>

</li>
<li>
<p>Using the storage-cache-config.xml but as storage-disabled</p>

</li>
<li>
<p>An alternate main class to run - <code>com.oracle.coherence.examples.Main</code></p>

</li>
</ul>
<markup
lang="yaml"

>apiVersion: coherence.oracle.com/v1
kind: Coherence
metadata:
  name: example-cluster-rest
spec:
  cluster: example-cluster
  jvm:
    memory:
      heapSize: 512m
  ports:
    - name: metrics
      port: 9612
      serviceMonitor:
        enabled: true
    - name: http
      port: 8080
  coherence:
    cacheConfig: storage-cache-config.xml
    storageEnabled: false
    metrics:
      enabled: true
  image: deployment-example:1.0.0
  imagePullPolicy: Always
  application:
    main: com.oracle.coherence.examples.Main</markup>


<h4 id="_install_the_rest_role">Install the <code>rest</code> role</h4>
<div class="section">
<p>Install the yaml with the following command:</p>

<markup
lang="bash"

>kubectl -n coherence-example apply -f src/main/yaml/example-cluster-app.yaml

kubectl get coherence -n coherence-example

NAME                      CLUSTER           ROLE                      REPLICAS   READY   PHASE
example-cluster-proxy     example-cluster   example-cluster-proxy     1          1       Ready
example-cluster-rest      example-cluster   example-cluster-rest      1          1       Ready
example-cluster-storage   example-cluster   example-cluster-storage   3          3       Ready</markup>

</div>

<h4 id="_view_the_running_pods_2">View the running pods</h4>
<div class="section">
<markup
lang="bash"

>kubectl -n coherence-example get pods

NAME                              READY   STATUS    RESTARTS   AGE
coherence-operator-578497bb5b-w89kt   1/1     Running   0          90m
example-cluster-proxy-0               1/1     Running   0          3m57s
example-cluster-rest-0                1/1     Running   0          3m57s
example-cluster-storage-0             1/1     Running   0          3m59s
example-cluster-storage-1             1/1     Running   0          3m58s
example-cluster-storage-2             1/1     Running   0          3m58s</markup>

</div>

<h4 id="_port_forward_the_application_port">Port forward the application port</h4>
<div class="section">
<p>In a separate terminal, run the following:</p>

<markup
lang="bash"

>kubectl port-forward -n coherence-example example-cluster-rest-0 8080:8080</markup>

</div>

<h4 id="_access_the_custom_query_endpoint">Access the custom <code>/query</code> endpoint</h4>
<div class="section">
<p>Use the various <code>CohQL</code> commands via the <code>/query</code> endpoint to access, and mutate data in the Coherence cluster.</p>

<markup
lang="bash"

>curl -i -w '\n' -X PUT http://127.0.0.1:8080/query -d '{"query":"create cache foo"}'</markup>

<markup
lang="bash"

>HTTP/1.1 200 OK
Date: Fri, 19 Jun 2020 06:29:40 GMT
transfer-encoding: chunked
connection: keep-alive</markup>

<markup
lang="bash"

>curl -i -w '\n' -X PUT http://127.0.0.1:8080/query -d '{"query":"insert into foo key(\"foo\") value(\"bar\")"}'</markup>

<markup
lang="bash"

>HTTP/1.1 200 OK
Date: Fri, 19 Jun 2020 06:29:44 GMT
transfer-encoding: chunked
connection: keep-alive</markup>

<markup
lang="bash"

>curl -i -w '\n' -X PUT http://127.0.0.1:8080/query -d '{"query":"select key(),value() from foo"}'</markup>

<markup
lang="bash"

>HTTP/1.1 200 OK
Content-Type: application/json
Date: Fri, 19 Jun 2020 06:29:55 GMT
transfer-encoding: chunked
connection: keep-alive

{"result":"{foo=[foo, bar]}"}</markup>

<markup
lang="bash"

>curl -i -w '\n' -X PUT http://127.0.0.1:8080/query -d '{"query":"create cache test"}'</markup>

<markup
lang="bash"

>HTTP/1.1 200 OK
Date: Fri, 19 Jun 2020 06:30:00 GMT
transfer-encoding: chunked
connection: keep-alive</markup>

<markup
lang="bash"

>curl -i -w '\n' -X PUT http://127.0.0.1:8080/query -d '{"query":"select count() from test"}'</markup>

<markup
lang="bash"

>HTTP/1.1 200 OK
Content-Type: application/json
Date: Fri, 19 Jun 2020 06:30:20 GMT
transfer-encoding: chunked
connection: keep-alive

{"result":"10001"}</markup>

</div>
</div>

<h3 id="ex4">Example 4 - Enabling Persistence</h3>
<div class="section">
<p>The fourth example uses the yaml file <code>src/main/yaml/example-cluster-persistence.yaml</code>, which
enabled Active Persistence for the <code>storage</code> role by adding a <code>persistence:</code> element.</p>

<p>The additional yaml added to the storage role below shows:</p>

<ul class="ulist">
<li>
<p>Active Persistence being enabled via <code>persistence.enabled=true</code></p>

</li>
<li>
<p>Various Persistence Volume Claim (PVC) values being set under <code>persistentVolumeClaim</code></p>

</li>
</ul>
<markup
lang="yaml"

>  coherence:
    cacheConfig: storage-cache-config.xml
    metrics:
      enabled: true
    persistence:
      enabled: true
      persistentVolumeClaim:
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 1Gi</markup>

<p>NOTE:By default, when you enable Coherence Persistence, the required infrastructure in terms of persistent volumes (PV) and persistent volume claims (PVC) is set up automatically. Also, the persistence-mode is set to <code>active</code>. This allows the Coherence cluster to be restarted, and the data to be retained.</p>


<h4 id="_delete_the_existing_deployment">Delete the existing deployment</h4>
<div class="section">
<p>We must first delete the existing deployment as we need to redeploy to enable Active Persistence.</p>

<markup
lang="bash"

>kubectl -n coherence-example delete -f src/main/yaml/example-cluster-app.yaml</markup>

<p>Ensure all the pods have terminated before you continue.</p>

</div>

<h4 id="_install_the_cluster_with_persistence_enabled">Install the cluster with Persistence enabled</h4>
<div class="section">
<markup
lang="bash"

>kubectl -n coherence-example create -f src/main/yaml/example-cluster-persistence.yaml</markup>

</div>

<h4 id="_view_the_running_pods_and_pvcs">View the running pods and PVC&#8217;s</h4>
<div class="section">
<markup
lang="bash"

>kubectl -n coherence-example get pods</markup>

<markup
lang="bash"

>NAME                            READY   STATUS    RESTARTS   AGE
example-cluster-rest-0          1/1     Running   0          5s
example-cluster-proxy-0         1/1     Running   0          5m1s
example-cluster-storage-0       1/1     Running   0          5m3s
example-cluster-storage-1       1/1     Running   0          5m3s
example-cluster-storage-2       1/1     Running   0          5m3s</markup>

<p>Check the Persistent Volumes and PVC are automatically created.</p>

<markup
lang="bash"

>kubectl get pvc -n coherence-example</markup>

<markup
lang="bash"

>NAME                                           STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
persistence-volume-example-cluster-storage-0   Bound    pvc-15b46996-eb35-11e9-9b4b-025000000001   1Gi        RWO            hostpath       55s
persistence-volume-example-cluster-storage-1   Bound    pvc-15bd99e9-eb35-11e9-9b4b-025000000001   1Gi        RWO            hostpath       55s
persistence-volume-example-cluster-storage-2   Bound    pvc-15e55b6b-eb35-11e9-9b4b-025000000001   1Gi        RWO            hostpath       55s</markup>

<p>Wait until all  nodes are Running and READY before continuing.</p>

</div>

<h4 id="_check_active_persistence_is_enabled">Check Active Persistence is enabled</h4>
<div class="section">
<p>Use the following to view the logs of the <code>example-cluster-storage-0</code> pod and validate that Active Persistence is enabled.</p>

<markup
lang="bash"

>kubectl logs example-cluster-storage-0 -c coherence -n coherence-example | grep 'Created persistent'</markup>

<markup
lang="bash"

>...
019-10-10 04:52:00.179/77.023 Oracle Coherence GE 12.2.1.4.0 &lt;Info&gt; (thread=DistributedCache:PartitionedCache, member=4): Created persistent store /persistence/active/example-cluster/PartitionedCache/126-2-16db40199bc-4
2019-10-10 04:52:00.247/77.091 Oracle Coherence GE 12.2.1.4.0 &lt;Info&gt; (thread=DistributedCache:PartitionedCache, member=4): Created persistent store /persistence/active/example-cluster/PartitionedCache/127-2-16db40199bc-4
...</markup>

<p>If you see output similar to above then Active Persistence is enabled.</p>

</div>

<h4 id="_connect_to_the_coherence_console_to_add_data">Connect to the Coherence Console to add data</h4>
<div class="section">
<markup
lang="bash"

>kubectl exec -it -n coherence-example example-cluster-storage-0 /coherence-operator/utils/runner console</markup>

<p>At the prompt type the following to create a cache called <code>test</code>:</p>

<markup
lang="bash"

>cache test</markup>

<p>Use the following to create 10,000 entries of 100 bytes:</p>

<markup
lang="bash"

>bulkput 10000 100 0 100</markup>

<p>Lastly issue the command <code>size</code> to verify the cache entry count.</p>

<p>Type <code>bye</code> to exit the console.</p>

</div>

<h4 id="_delete_the_cluster">Delete the cluster</h4>
<div class="section">
<div class="admonition note">
<p class="admonition-inline">This will not delete the PVC&#8217;s.</p>
</div>
<markup
lang="bash"

>kubectl -n coherence-example delete -f src/main/yaml/example-cluster-persistence.yaml</markup>

<p>Use <code>kubectl get pods -n coherence-example</code> to confirm the pods have terminated.</p>

</div>

<h4 id="_confirm_the_pvcs_are_still_present">Confirm the PVC&#8217;s are still present</h4>
<div class="section">
<markup
lang="bash"

>kubectl get pvc -n coherence-example</markup>

<markup
lang="bash"

>NAME                                           STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
persistence-volume-example-cluster-storage-0   Bound    pvc-730f86fe-eb19-11e9-9b4b-025000000001   1Gi        RWO            hostpath       116s
persistence-volume-example-cluster-storage-1   Bound    pvc-73191751-eb19-11e9-9b4b-025000000001   1Gi        RWO            hostpath       116s
persistence-volume-example-cluster-storage-2   Bound    pvc-73230889-eb19-11e9-9b4b-025000000001   1Gi        RWO            hostpath       116s</markup>

</div>

<h4 id="_re_install_the_cluster">Re-install the cluster</h4>
<div class="section">
<markup
lang="bash"

>kubectl -n coherence-example create -f src/main/yaml/example-cluster-persistence.yaml</markup>

</div>

<h4 id="_follow_the_logs_for_persistence_messages">Follow the logs for Persistence messages</h4>
<div class="section">
<markup
lang="bash"

>kubectl logs example-cluster-storage-0 -c coherence -n coherence-example -f</markup>

<p>You should see a message regarding recovering partitions, similar to the following:</p>

<markup
lang="bash"

>2019-10-10 05:00:14.255/32.206 Oracle Coherence GE 12.2.1.4.0 &lt;D5&gt; (thread=DistributedCache:PartitionedCache, member=1): Recovering 86 partitions
...
2019-10-10 05:00:17.417/35.368 Oracle Coherence GE 12.2.1.4.0 &lt;Info&gt; (thread=DistributedCache:PartitionedCache, member=1): Created persistent store /persistence/active/example-cluster/PartitionedCache/50-3-16db409d035-1 from SafeBerkeleyDBStore(50-2-16db40199bc-4, /persistence/active/example-cluster/PartitionedCache/50-2-16db40199bc-4)
...</markup>

<p>Finally, you should see the following indicating active recovery has completed.</p>

<markup
lang="bash"

>2019-10-10 08:18:04.870/59.565 Oracle Coherence GE 12.2.1.4.0 &lt;Info&gt; (thread=DistributedCache:PartitionedCache, member=1):
   Recovered PartitionSet{172..256} from active persistent store</markup>

</div>

<h4 id="_confirm_the_data_has_been_recovered">Confirm the data has been recovered</h4>
<div class="section">
<markup
lang="bash"

>kubectl exec -it -n coherence-example example-cluster-storage-0 /coherence-operator/utils/runner console</markup>

<p>At the prompt type the following to create a cache called <code>test</code>:</p>

<markup
lang="bash"

>cache test</markup>

<p>Lastly issue the command <code>size</code> to verify the cache entry count is 10,000 meaning the data has been recovered.</p>

<p>Type <code>bye</code> to exit the console.</p>

</div>
</div>

<h3 id="metrics">View Cluster Metrics via Grafana</h3>
<div class="section">
<p>If you wish to view metrics via Grafana, you must carry out the following steps <strong>before</strong> you
install any of the examples above.</p>


<h4 id="_install_prometheus_operator">Install Prometheus Operator</h4>
<div class="section">
<p>Add the <code>stable</code> helm repository</p>

<markup
lang="bash"

>helm repo add stable https://charts.helm.sh/stable

helm repo update</markup>

</div>

<h4 id="_create_prometheus_pre_requisites">Create Prometheus pre-requisites</h4>
<div class="section">
<markup
lang="bash"

>    kubectl apply -f src/main/yaml/prometheus-rbac.yaml</markup>

</div>

<h4 id="_create_config_maps_for_datasource_and_dashboards">Create Config Maps for datasource and dashboards</h4>
<div class="section">
<markup
lang="bash"

>kubectl -n coherence-example create -f src/main/yaml/grafana-datasource-config.yaml

kubectl -n coherence-example label configmap demo-grafana-datasource grafana_datasource=1

kubectl -n coherence-example create -f https://oracle.github.io/coherence-operator/dashboards/latest/coherence-grafana-dashboards.yaml

kubectl -n coherence-example label configmap coherence-grafana-dashboards grafana_dashboard=1</markup>

</div>

<h4 id="_install_prometheus_operator_2">Install Prometheus Operator</h4>
<div class="section">
<div class="admonition note">
<p class="admonition-inline">If you have already installed Prometheus Operator before on this Kubernetes Cluster then set <code>--set prometheusOperator.createCustomResource=false</code>.</p>
</div>
<p>Issue the following command to install the Prometheus Operator using Helm:</p>

<markup
lang="bash"

>helm install --namespace coherence-example --version 8.13.9 \
    --set grafana.enabled=true \
    --set prometheusOperator.createCustomResource=true \
    --values src/main/yaml/prometheus-values.yaml prometheus stable/prometheus-operator</markup>

<div class="admonition tip">
<p class="admonition-textlabel">Tip</p>
<p ><p>Note: for Helm version 2, use the following:</p>

<markup
lang="bash"

>helm install --namespace coherence-example --version 8.13.9 \
    --set grafana.enabled=true --name prometheus \
    --set prometheusOperator.createCustomResource=true \
    --values src/main/yaml/prometheus-values.yaml stable/prometheus-operator</markup>
</p>
</div>
<p>Use the following to view the installed pods:</p>

<markup
lang="bash"

>kubectl get pods -n coherence-example</markup>

<markup
lang="bash"

>NAME                                                   READY   STATUS    RESTARTS   AGE
coherence-operator-578497bb5b-w89kt                    1/1     Running   0          136m
prometheus-grafana-6bb6d86f86-rgsm6                    2/2     Running   0          85s
prometheus-kube-state-metrics-5496457bd-vjqgd          1/1     Running   0          85s
prometheus-prometheus-node-exporter-29lrp              1/1     Running   0          85s
prometheus-prometheus-node-exporter-82b5w              1/1     Running   0          85s
prometheus-prometheus-node-exporter-mbj2k              1/1     Running   0          85s
prometheus-prometheus-oper-operator-6bc97bc4d7-67qjp   2/2     Running   0          85s
prometheus-prometheus-prometheus-oper-prometheus-0     3/3     Running   1          68s</markup>

<p>Remember to now install one of the examples above.  If you have already had the examples installed,
you must delete and re-install once you have installed Prometheus operator.</p>

</div>

<h4 id="_port_forward_and_access_grafana">Port Forward and Access Grafana</h4>
<div class="section">
<p>Port-forward the ports for these components using the scripts
in the <code>examples/deployment/scripts/</code> directory.</p>

<ul class="ulist">
<li>
<p>Port-forward Grafana for viewing metrics</p>

</li>
</ul>
<markup
lang="bash"

>./port-forward-grafana.sh coherence-example</markup>

<markup
lang="bash"

>Port-forwarding coherence-operator-grafana-8454698bcf-5dqvm in coherence-example
Open the following URL: http://127.0.0.1:3000/d/coh-main/coherence-dashboard-main
Forwarding from 127.0.0.1:3000 -&gt; 3000
Forwarding from [::1]:3000 -&gt; 3000</markup>

<p>The default username is <code>admin</code> and the password is <code>prom-operator</code>.</p>

<ul class="ulist">
<li>
<p>Port-forward Kibana for viewing log messages</p>

</li>
</ul>
<markup
lang="bash"

>./port-forward-kibana.sh coherence-example</markup>

<markup
lang="bash"

>Port-forwarding kibana-67c4f74ffb-nspwz in coherence-example
Open the following URL: http://127.0.0.1:5601/
Forwarding from 127.0.0.1:5601 -&gt; 5601
Forwarding from [::1]:5601 -&gt; 5601</markup>

<ul class="ulist">
<li>
<p>Port-forward Prometheus (for troubleshooting only)</p>

</li>
</ul>
<markup
lang="bash"

>./port-forward-prometheus.sh coherence-example</markup>

<markup
lang="bash"

>Port-forwarding prometheus-prometheus-prometheus-oper-prometheus-0 in coherence-example
Open the following URL: http://127.0.0.1:9090/targets
Forwarding from 127.0.0.1:9090 -&gt; 9090
Forwarding from [::1]:9090 -&gt; 9090</markup>

<ul class="ulist">
<li>
<p>Open the URLS described above.</p>

</li>
</ul>
</div>

<h4 id="_troubleshooting">Troubleshooting</h4>
<div class="section">
<ul class="ulist">
<li>
<p>It may take up to 5 minutes for data to start appearing in Grafana.</p>

</li>
<li>
<p>If you are not seeing data after 5 minutes, access the Prometheus endpoint as described above.
Ensure that the endpoints named <code>coherence-example/example-cluster-storage-metrics/0 (3/3 up)</code> are up.</p>
<pre>If the endpoints are not up then wait 60 seconds and refresh the browser.</pre>
</li>
<li>
<p>If you do not see any values in the <code>Cluster Name</code> dropdown in Grafana, ensure the endpoints are up as  described above and click on <code>Manage Alerts</code> and then <code>Back to Main Dashboard</code>. This will re-query the data and load the list of clusters.</p>

</li>
</ul>
</div>
</div>

<h3 id="_cleaning_up">Cleaning Up</h3>
<div class="section">

<h4 id="_delete_the_cluster_2">Delete the cluster</h4>
<div class="section">
<markup
lang="bash"

>kubectl -n coherence-example delete -f src/main/yaml/example-cluster-persistence.yaml</markup>

</div>

<h4 id="_delete_the_pvcs">Delete the PVC&#8217;s</h4>
<div class="section">
<p>Ensure all the pods have all terminated before you delete the PVC&#8217;s.</p>

<markup
lang="bash"

>kubectl get pvc -n coherence-example | sed 1d | awk '{print $1}' | xargs kubectl delete pvc -n coherence-example</markup>

</div>

<h4 id="_remove_the_coherence_operator">Remove the Coherence Operator</h4>
<div class="section">
<p>Uninstall the Coherence operator using the undeploy commands for whichever method you chose to install it.</p>

</div>

<h4 id="_delete_prometheus_operator">Delete Prometheus Operator</h4>
<div class="section">
<markup
lang="bash"

> helm delete prometheus --namespace coherence-example

 kubectl -n coherence-example delete -f src/main/yaml/grafana-datasource-config.yaml

 kubectl -n coherence-example delete configmap coherence-grafana-dashboards

 kubectl delete -f src/main/yaml/prometheus-rbac.yaml</markup>

<div class="admonition tip">
<p class="admonition-textlabel">Tip</p>
<p ><p>For Helm version 2 use the following:</p>

<markup
lang="bash"

>helm delete prometheus --purge</markup>
</p>
</div>
<div class="admonition note">
<p class="admonition-inline">You can optionally delete the Prometheus Operator Custom Resource Definitions (CRD&#8217;s) if you are not going to install Prometheus Operator again.</p>
</div>
<markup
lang="bash"

>$ kubectl delete crd alertmanagers.monitoring.coreos.com
$ kubectl delete crd podmonitors.monitoring.coreos.com
$ kubectl delete crd prometheuses.monitoring.coreos.com
$ kubectl delete crd prometheusrules.monitoring.coreos.com
$ kubectl delete crd prometheusrules.monitoring.coreos.com
$ kubectl delete crd servicemonitors.monitoring.coreos.com
$ kubectl delete crd thanosrulers.monitoring.coreos.com</markup>

<p>A shorthand way of doing this if you are running Linux/Mac is:</p>

<markup
lang="bash"

>kubectl get crds -n coherence-example | grep monitoring.coreos.com | awk '{print $1}' | xargs kubectl delete crd</markup>

</div>
</div>
</div>
</doc-view>
